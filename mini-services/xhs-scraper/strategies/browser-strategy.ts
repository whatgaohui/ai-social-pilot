/**
 * Playwright-based scraping strategies for Xiaohongshu
 *
 * Uses real browser context to bypass XHS signature checks.
 * Intercepts XHR responses to extract structured data.
 */

import { getBrowserManager, type XhsBrowserManager } from '../browser';
import { promises as fs } from 'fs';
import * as path from 'path';
import type {
  AccountData,
  PostData,
  ProfileScrapeResult,
  PostsScrapeResult,
  NoteScrapeResult,
  MediaDownloadResult
} from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────

function extractUserIdFromUrl(url: string): string {
  const profileMatch = url.match(
    /xiaohongshu\.com\/user\/profile\/([a-f0-9]{24}|[A-Za-z0-9_-]+)/
  );
  if (profileMatch) return profileMatch[1];
  return '';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Media Download Utilities ─────────────────────────────────────────────

/**
 * Ensure directory exists
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    // Ignore if already exists
  }
}

/**
 * Download a single file with retry logic
 */
async function downloadFile(
  url: string,
  outputPath: string,
  cookie: string,
  options: {
    timeout?: number;
    maxSize?: number;
    retries?: number;
  } = {}
): Promise<boolean> {
  const { timeout = 30000, maxSize = 50 * 1024 * 1024, retries = 2 } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.xiaohongshu.com/',
          'Cookie': cookie,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0');
      if (contentLength > maxSize) {
        throw new Error(`File too large: ${contentLength} bytes (max: ${maxSize})`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > maxSize) {
        throw new Error(`Downloaded file too large: ${arrayBuffer.byteLength} bytes`);
      }

      await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`[Download] Attempt ${attempt + 1}/${retries + 1} failed for ${url}: ${msg}`);

      if (attempt < retries) {
        await delay(1000); // Wait 1s before retry
      }
    }
  }

  return false;
}

/**
 * Download images with concurrency limit
 */
async function downloadImages(
  noteId: string,
  imageUrls: string[],
  cookie: string,
  maxConcurrency: number = 3
): Promise<string[]> {
  const imagePaths: string[] = [];
  // Use project root's public directory (two levels up from this file)
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  const baseDir = path.join(projectRoot, 'public', 'upload', 'images', noteId);

  await ensureDir(baseDir);

  // Process images in batches
  for (let i = 0; i < imageUrls.length; i += maxConcurrency) {
    const batch = imageUrls.slice(i, i + maxConcurrency);
    const batchPromises = batch.map(async (url, batchIndex) => {
      const globalIndex = i + batchIndex;
      const ext = url.includes('.png') ? 'png' : 'jpg';
      const filename = `${globalIndex}.${ext}`;
      const outputPath = path.join(baseDir, filename);

      const success = await downloadFile(url, outputPath, cookie, {
        timeout: 30000,
        retries: 2,
      });

      if (success) {
        return `/upload/images/${noteId}/${filename}`;
      } else {
        console.warn(`[Download] Failed to download image ${globalIndex} for note ${noteId}`);
        return '';
      }
    });

    const batchResults = await Promise.all(batchPromises);
    imagePaths.push(...batchResults.filter(Boolean));
  }

  return imagePaths;
}

/**
 * Download video file
 */
async function downloadVideo(
  noteId: string,
  videoUrl: string,
  cookie: string
): Promise<string> {
  // Use project root's public directory (two levels up from this file)
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  const baseDir = path.join(projectRoot, 'public', 'upload', 'videos');
  await ensureDir(baseDir);

  const filename = `${noteId}.mp4`;
  const outputPath = path.join(baseDir, filename);

  const success = await downloadFile(videoUrl, outputPath, cookie, {
    timeout: 30000,
    maxSize: 50 * 1024 * 1024, // 50MB
    retries: 2,
  });

  if (success) {
    return `/upload/videos/${filename}`;
  } else {
    console.warn(`[Download] Failed to download video for note ${noteId}`);
    return '';
  }
}

/**
 * Download media (images and/or video) for a note
 */
export async function downloadMedia(
  noteId: string,
  imageUrls: string[],
  videoUrl: string,
  cookie: string
): Promise<MediaDownloadResult> {
  const result: MediaDownloadResult = {
    imagePaths: [],
    videoPath: '',
    videoThumbnail: '',
  };

  try {
    // Download images if available
    if (imageUrls.length > 0) {
      result.imagePaths = await downloadImages(noteId, imageUrls, cookie);
      // Use first image as thumbnail
      if (result.imagePaths.length > 0) {
        result.videoThumbnail = result.imagePaths[0];
      }
    }

    // Download video if available
    if (videoUrl) {
      result.videoPath = await downloadVideo(noteId, videoUrl, cookie);

      // If no images, we would need to extract video frame as thumbnail
      // For now, leave empty (can be enhanced with ffmpeg later)
      if (!result.videoThumbnail && result.videoPath) {
        console.log(`[Download] Video thumbnail extraction not implemented for note ${noteId}`);
      }
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Download] Media download failed for note ${noteId}: ${msg}`);
    return result;
  }
}

// ─── Strategy 1: XHR Intercept (Primary) ─────────────────────────────────

/**
 * Scrape user profile by intercepting XHR responses.
 * Opens the profile page, waits for the user info API call, extracts data.
 */
export async function scrapeProfileWithBrowser(
  url: string
): Promise<ProfileScrapeResult> {
  const warnings: string[] = [];
  const manager = getBrowserManager();

  await manager.init();
  const page = await manager.getPage();

  const userId = extractUserIdFromUrl(url);
  if (!userId) {
    return { success: false, error: '无法从URL中提取用户ID' };
  }

  console.log(`[Browser] Scraping profile for userId: ${userId}`);

  try {
    // Set up response interceptors BEFORE navigation
    let interceptedJson: any = null;
    let interceptedUserApi = '';
    const postsResponses: any[] = [];
    const postsCursors = new Set<string>();

    // Response listener for ALL edith API endpoints
    page.on('response', async (res) => {
      if (!res.url().includes('edith.xiaohongshu.com')) return;
      const urlPath = res.url().split('?')[0];
      console.log(`[Browser] edith API: ${urlPath.split('/').slice(-4).join('/')}`);

      // Capture user/otherinfo API
      if (
        urlPath.includes('/api/sns/web/v1/user/otherinfo') &&
        res.status() === 200
      ) {
        try {
          interceptedJson = await res.json();
          interceptedUserApi = 'otherinfo';
          console.log('[Browser] Intercepted user info API response');
        } catch {
          // ignore
        }
      }

      // Capture ALL user_posted API responses (paginated)
      if (urlPath.includes('sns/web/v1/user_posted') && res.status() === 200) {
        try {
          const json = await res.json();
          const cursor = json.data?.cursor || '';
          if (!postsCursors.has(cursor)) {
            postsCursors.add(cursor);
            postsResponses.push(json);
            console.log(`[Browser] Intercepted posts API (notes: ${(json.data?.notes || []).length})`);
          }
        } catch {
          // ignore
        }
      }
    });

    // Navigate to the profile page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Close any login overlay or popup
    try {
      await page.evaluate(() => {
        const closeBtns = document.querySelectorAll(
          '[class*="close"], [class*="dismiss"], [class*="Close"], [aria-label*="close"], [aria-label*="Close"], .close-button, .modal-close, [class*="login"] button[class*="close"]'
        );
        for (const btn of closeBtns) {
          if (btn.tagName === 'BUTTON' || btn.tagName === 'SPAN' || btn.tagName === 'svg') {
            (btn as HTMLElement).click();
          }
        }
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });
    } catch {}

    await delay(3000);

    // Try to extract profile stats from DOM
    let domStats: Partial<AccountData> = {};
    try {
      domStats = await page.evaluate(() => {
        const pageText = document.body.innerText || '';
        // Look for patterns like "1234 粉丝" "567 关注" "8.9万 获赞与收藏"
        const fansMatch = pageText.match(/(\d+(?:\.\d+)?[万千]?)\s*粉/);
        const followsMatch = pageText.match(/(\d+(?:\.\d+)?[万千]?)\s*关注/);
        const likesMatch = pageText.match(/(\d+(?:\.\d+)?[万千]?)\s*(获赞|赞)/);

        function parseCount(str: string): number {
          if (!str) return 0;
          if (str.includes('万')) return Math.round(parseFloat(str) * 10000);
          if (str.includes('千')) return Math.round(parseFloat(str) * 1000);
          return parseInt(str) || 0;
        }

        // Try to find avatar URL
        const avatarImg = document.querySelector('img[class*="avatar"], img[class*="Avatar"], [class*="avatar"] img');
        const avatarUrl = avatarImg?.getAttribute('src') || avatarImg?.getAttribute('data-src') || '';

        return {
          followers: parseCount(fansMatch?.[1] || ''),
          following: parseCount(followsMatch?.[1] || ''),
          likedCollected: parseCount(likesMatch?.[1] || ''),
          avatarUrl: avatarUrl.startsWith('http') ? avatarUrl : '',
        };
      });
      console.log(`[Browser] DOM stats: ${JSON.stringify(domStats)}`);
    } catch {}

    await delay(3000); // Wait for XHR to fire and modal to close

    // Use intercepted data or fallback to DOM
    let accountData: AccountData | null = null;
    if (interceptedJson) {
      accountData = parseAccountFromApi(interceptedJson, userId);
      console.log(`[Browser] Got account data from XHR: ${accountData?.nickname}`);
    }

    if (!accountData || !accountData.nickname) {
      console.log('[Browser] XHR data unavailable, falling back to DOM parsing');
      warnings.push('未捕获到API响应，使用页面解析');
      accountData = await parseAccountFromDom(page, userId);
    }

    if (!accountData) {
      return {
        success: false,
        error: '无法获取用户信息',
      };
    }

    // Merge DOM-extracted stats into account data
    accountData.xhsId = userId; // Always set from URL
    if (domStats.followers) accountData.followers = domStats.followers;
    if (domStats.following) accountData.following = domStats.following;
    if (domStats.likedCollected) accountData.likedCollected = domStats.likedCollected;
    if (domStats.avatarUrl) accountData.avatarUrl = domStats.avatarUrl;

    // Scroll to trigger pagination and capture more posts
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await delay(2500);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await delay(2000);

    // Parse all intercepted posts responses
    const posts: PostData[] = [];
    for (const json of postsResponses) {
      const { posts: pagePosts } = parsePostsFromApi(json);
      posts.push(...pagePosts);
      console.log(`[Browser] Parsed ${pagePosts.length} posts from API (total: ${posts.length})`);
    }

    // Fallback to DOM parsing if API was blocked (461)
    if (posts.length === 0) {
      console.log('[Browser] Posts API blocked (461), falling back to DOM parsing');
      const domPosts = await parsePostsFromDom(page);
      posts.push(...domPosts);
      console.log(`[Browser] Parsed ${domPosts.length} posts from DOM`);
    }

    // Set notes count from actual posts
    accountData.notesCount = posts.length;

    if (posts.length > 0) {
      warnings.push('发布时间无法从API获取，需逐个笔记详情页提取（影响性能）');
    }

    const partialData = !accountData.nickname || accountData.followers === 0;
    if (partialData) {
      warnings.push('数据可能不完整，建议手动补充');
    }

    return {
      success: true,
      data: {
        account: accountData,
        posts,
        totalFound: posts.length,
        scrapeMethod: 'browser',
        warnings,
        partialData,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Browser scraping error';
    console.error('[Browser] Profile scraping error:', msg);
    warnings.push(`浏览器抓取异常: ${msg}`);
    return {
      success: false,
      error: msg,
    };
  } finally {
    await manager.saveCookies();
    // Close page but keep browser alive
    try {
      await page.close();
    } catch {
      // ignore
    }
  }
}

/**
 * Scrape posts list for a user via browser XHR interception.
 * Accepts an optional existing page to reuse.
 */
export async function scrapePostsWithBrowserInternal(
  userId: string,
  existingPage?: any
): Promise<PostData[]> {
  const manager = getBrowserManager();
  if (!manager.isReady()) return [];

  let page = existingPage;
  let ownsPage = false;
  if (!page) {
    page = await manager.getPage();
    ownsPage = true;
  }

  const profileUrl = `https://www.xiaohongshu.com/user/profile/${userId}`;

  // Collect ALL posts API responses with different cursors
  const allResponses: any[] = [];
  const seenCursors = new Set<string>();

  // Set up ONE persistent listener before navigation
  page.on('response', async (res) => {
    if (
      res.url().includes('edith.xiaohongshu.com') &&
      res.url().includes('/api/sns/web/v1/user_posted') &&
      res.status() === 200
    ) {
      try {
        const json = await res.json();
        const cursor = json.data?.cursor || '';
        if (!seenCursors.has(cursor)) {
          seenCursors.add(cursor);
          allResponses.push(json);
          console.log(`[Browser] Intercepted posts API (cursor: ${cursor.substring(0, 20)}, notes: ${(json.data?.notes || []).length})`);
        }
      } catch (e) {
        console.log(`[Browser] Failed to parse posts API: ${e}`);
      }
    }
  });

  try {
    // Navigate to profile
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await delay(4000);

    // Scroll to trigger pagination
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await delay(2500);
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await delay(2000);

    // Parse all intercepted responses
    const allPosts: PostData[] = [];
    for (const json of allResponses) {
      const { posts } = parsePostsFromApi(json);
      allPosts.push(...posts);
      console.log(`[Browser] Parsed ${posts.length} posts (total unique: ${allPosts.length})`);
    }

    if (allPosts.length === 0) {
      console.log('[Browser] Posts XHR missed, trying DOM');
      const domPosts = await parsePostsFromDom(page);
      allPosts.push(...domPosts);
    }

    return allPosts;
  } catch (err) {
    console.error('[Browser] Posts scraping error:', err);
    return [];
  } finally {
    if (ownsPage) {
      try {
        await page.close();
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Scrape a single note detail via browser.
 */
export async function scrapeNoteWithBrowser(
  noteId: string
): Promise<NoteScrapeResult> {
  const warnings: string[] = [];
  const manager = getBrowserManager();

  await manager.init();
  const page = await manager.getPage();

  try {
    const noteUrl = `https://www.xiaohongshu.com/explore/${noteId}`;

    // Set up response interceptor before navigation
    let interceptedJson: any = null;
    page.on('response', async (res) => {
      if (
        res.url().includes('edith.xiaohongshu.com') &&
        res.url().includes('/api/sns/web/v1/feed') &&
        res.status() === 200
      ) {
        try {
          interceptedJson = await res.json();
          console.log('[Browser] Intercepted note API response');
        } catch {
          // ignore
        }
      }
    });

    await page.goto(noteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(3000);

    let noteData;
    if (interceptedJson) {
      noteData = parseNoteFromApi(interceptedJson, noteId);
    } else {
      warnings.push('未捕获到笔记API响应，使用页面解析');
      noteData = await parseNoteFromDom(page, noteId);
    }

    // Download media files (images and/or video)
    try {
      // Get cookies from browser context for authentication
      const cookies = await page.context().cookies();
      const cookieString = cookies
        .filter(c => c.domain.includes('xiaohongshu.com') || c.domain.includes('rednote.com'))
        .map(c => `${c.name}=${c.value}`)
        .join('; ');

      // Download media if URLs are available
      if (noteData.imageUrls.length > 0 || noteData.videoUrl) {
        console.log(`[Browser] Downloading media for note ${noteId}...`);
        const mediaResult = await downloadMedia(
          noteId,
          noteData.imageUrls,
          noteData.videoUrl,
          cookieString
        );

        // Merge downloaded paths into noteData
        noteData.imagePaths = mediaResult.imagePaths;
        noteData.videoPath = mediaResult.videoPath;
        noteData.videoThumbnail = mediaResult.videoThumbnail;

        if (mediaResult.imagePaths.length > 0) {
          console.log(`[Browser] Downloaded ${mediaResult.imagePaths.length} images`);
        }
        if (mediaResult.videoPath) {
          console.log(`[Browser] Downloaded video: ${mediaResult.videoPath}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`[Browser] Media download failed for note ${noteId}: ${msg}`);
      warnings.push(`媒体下载失败: ${msg}`);
      // Continue without downloaded media
    }

    return {
      success: true,
      data: {
        note: noteData,
        scrapeMethod: interceptedJson ? 'browser' : 'browser_dom',
        warnings,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Note scraping error';
    console.error('[Browser] Note scraping error:', msg);
    return {
      success: false,
      error: msg,
    };
  } finally {
    await manager.saveCookies();
    try {
      await page.close();
    } catch {
      // ignore
    }
  }
}

// ─── API Response Parsers ─────────────────────────────────────────────────

function parseAccountFromApi(json: any, fallbackId: string): AccountData | null {
  try {
    const data = json.data || json.result || {};
    const userInfo = data.user_basic || data.user || data;

    return {
      nickname: userInfo.nickname || userInfo.nickName || '',
      xhsId: userInfo.user_id || userInfo.userId || fallbackId,
      avatarUrl: userInfo.images || userInfo.avatar || userInfo.image || '',
      bio: userInfo.desc || '',
      location: userInfo.ip_location || '',
      followers: Number(userInfo.fans_count || userInfo.followers || 0),
      following: Number(userInfo.follows || 0),
      likedCollected: Number(userInfo.liked_count || 0),
      notesCount: Number(userInfo.notes_count || 0),
    };
  } catch {
    return null;
  }
}

function parsePostsFromApi(json: any): { posts: PostData[]; nextCursor: string; more: boolean } {
  try {
    const data = json.data || {};
    const notes = data.notes || data.list || [];

    // Debug: check first note for time fields
    if (notes.length > 0) {
      const n = notes[0];
      const timeFields = Object.keys(n).filter(k => k.includes('time') || k.includes('date') || k.includes('at') || k.includes('stamp'));
      console.log(`[DEBUG] Time-related fields in note: ${timeFields.join(', ')}`);
      for (const k of ['create_time', 'publish_time', 'last_update_time', 'time', 'display_time', 'updated_at', 'created_at', 'note_date']) {
        if (n[k] !== undefined) console.log(`  ${k}: ${n[k]}`);
      }
    }

    const cursor = data.cursor || '';
    const hasMore = data.has_more ?? false;

    const posts: PostData[] = notes.map((note: any) => {
      const cover = note.cover || {};
      const interact = note.interact_info || {};
      const user = note.user || {};
      const coverUrl = cover.url_default || cover.url_pre ||
        cover.info_list?.[0]?.url || cover.image_list?.[0]?.url || '';

      // Extract image list if available
      const imageList = note.image_list || cover.image_list || [];
      const imageUrls = imageList
        .map((img: any) => img.url_default || img.url_info?.url || img.url || '')
        .filter(Boolean);

      // Video URL from list API (sometimes available)
      const videoUrl = note.video?.media?.stream?.url
        || note.video?.url || '';

      const likes = Number(String(interact.liked_count || '0').replace(/\D/g, '')) || 0;

      // Extract publish date from multiple possible fields
      const publishDate = note.create_time || note.publish_time ||
        note.last_update_time || note.time ||
        note.display_time || '';

      return {
        xhsPostId: note.note_id || '',
        title: note.display_title || note.title || '',
        content: note.desc || '',
        coverUrl,
        imageUrls,
        videoUrl,
        likes,
        comments: Number(String(interact.comment_count || '0').replace(/\D/g, '')) || 0,
        collects: Number(String(interact.collect_count || '0').replace(/\D/g, '')) || 0,
        shares: Number(String(interact.share_count || '0').replace(/\D/g, '')) || 0,
        tags: (note.tag_list || []).map((t: any) =>
          typeof t === 'string' ? t : t.name || ''
        ).filter(Boolean),
        postType: note.type === 'video' ? 'video' : 'normal',
        publishDate,
      };
    });

    return { posts, nextCursor: cursor, more: hasMore };
  } catch {
    return { posts: [], nextCursor: '', more: false };
  }
}

function parseNoteFromApi(json: any, fallbackNoteId: string) {
  try {
    const data = json.data || {};
    const items = data.items || [data];
    const noteItem = items[0] || data;
    const noteData = noteItem.note_card || noteItem.note || noteItem;

    const noteCard = noteItem.note_card || noteItem;

    // Video URL extraction (multiple fallback paths based on MediaCrawler research)
    const video = noteCard.video || {};
    const videoUrl = video.media?.stream?.url
      || video.media?.stream?.h264?.[0]?.master_url
      || video.media?.stream?.h265?.[0]?.master_url
      || video.url || '';

    // Publish time: note_card.time is Unix timestamp in seconds
    const publishDate = noteCard.time
      ? new Date(Number(noteCard.time) * 1000).toISOString()
      : '';

    // Image list extraction (higher quality URLs)
    const imageUrls = (noteCard.image_list || [])
      .map((img: any) => {
        // Try url_default first (highest quality), then fallback chain
        return img.url_default
          || img.url_info?.url
          || img.info_list?.[0]?.url
          || img.url
          || '';
      })
      .filter(Boolean);

    // Tags extraction
    const tags = (noteCard.tag_list || [])
      .map((t: any) => {
        if (typeof t === 'string') return t;
        return t.name || t.tag_type || t.title || '';
      })
      .filter(Boolean);

    return {
      noteId: noteData.note_id || noteCard.note_id || fallbackNoteId,
      title: noteData.title || noteCard.title || '',
      content: noteData.desc || noteCard.desc || '',
      coverUrl: noteData.cover?.url || imageUrls[0] || '',
      imageUrls,
      videoUrl,
      likes: Number(noteData.interact_info?.liked_count || noteCard.interact_info?.liked_count || 0),
      comments: Number(noteData.interact_info?.comment_count || noteCard.interact_info?.comment_count || 0),
      collects: Number(noteData.interact_info?.collect_count || noteCard.interact_info?.collect_count || 0),
      shares: Number(noteData.interact_info?.share_count || noteCard.interact_info?.share_count || 0),
      tags,
      postType: noteData.type === 'video' || noteCard.type === 'video' ? 'video' : 'normal',
      publishDate,
      authorNickname: noteData.user?.nickname || noteCard.user?.nickname || '',
      authorAvatar: noteData.user?.avatar || noteCard.user?.avatar || '',
      commentCount: Number(noteData.interact_info?.comment_count || noteCard.interact_info?.comment_count || 0),
      // Media download fields (initialized empty, populated by scrapeNoteWithBrowser)
      imagePaths: [],
      videoPath: '',
      videoThumbnail: '',
    };
  } catch {
    return {
      noteId: fallbackNoteId,
      title: '',
      content: '',
      coverUrl: '',
      imageUrls: [],
      videoUrl: '',
      likes: 0,
      comments: 0,
      collects: 0,
      shares: 0,
      tags: [],
      postType: 'normal',
      publishDate: '',
      authorNickname: '',
      authorAvatar: '',
      commentCount: 0,
      // Media download fields
      imagePaths: [],
      videoPath: '',
      videoThumbnail: '',
    };
  }
}

// ─── DOM Parsers (Fallback) ───────────────────────────────────────────────

async function parseAccountFromDom(page: any, userId: string): Promise<AccountData | null> {
  try {
    // Scroll to trigger lazy-loaded content
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, 500);
        await new Promise(r => setTimeout(r, 500));
      }
      window.scrollTo(0, 0);
    });

    const info = await page.evaluate(async () => {
      // Try to find user info in __INITIAL_SSR_STATE__ or page DOM
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        if (s.textContent?.includes('__INITIAL_SSR_STATE__')) {
          try {
            const match = s.textContent?.match(/__INITIAL_SSR_STATE__\s*=\s*({[\s\S]*?})\s*(?:;|$)/);
            if (match) {
              const state = JSON.parse(match[1]);
              const user = state.user?.user || state.user?.userInfo || state.userBasic || {};
              return {
                nickname: user.nickname || user.nickName || user.displayName || '',
                xhsId: user.user_id || user.userId || user.id || '',
                avatarUrl: user.images || user.avatar || user.image || user.avatarUrl || '',
                bio: user.desc || user.description || '',
                location: user.ip_location || user.location || '',
                followers: Number(user.fans_count || user.fans || user.followers || 0),
                following: Number(user.follows || user.following || 0),
                likedCollected: Number(user.liked_count || user.likedAndCollected || 0),
                notesCount: Number(user.notes_count || user.noteCount || 0),
              };
            }
          } catch {
            // ignore
          }
        }
      }

      // Fallback: extract from visible DOM elements (excluding login overlays)
      // Remove login overlay first
      const loginOverlays = document.querySelectorAll(
        '[class*="login"], [class*="modal"], [class*="popup"], [class*="dialog"]'
      );
      for (const overlay of loginOverlays) {
        const text = overlay.textContent || '';
        if (text.includes('登录') || text.includes('手机') || text.includes('验证')) {
          (overlay as HTMLElement).style.display = 'none';
        }
      }

      // Wait a frame for re-render
      await new Promise(r => setTimeout(r, 100));

      const nicknameEl = document.querySelector(
        '[class*="name"], [class*="user-name"], [class*="nickname"], h1, h2'
      );
      let nickname = nicknameEl?.textContent?.trim() || '';

      // Filter out login-related text
      if (nickname.includes('登录') || nickname.includes('手机号') || nickname.includes('获取')) {
        nickname = '';
      }

      const bioEl = document.querySelector('[class*="desc"], [class*="bio"], [class*="introduction"], [class*="signature"]');
      const bio = bioEl?.textContent?.trim() || '';

      return {
        nickname: nickname.split(' - ')[0]?.trim() || '',
        xhsId: '',
        avatarUrl: '',
        bio,
        location: '',
        followers: 0,
        following: 0,
        likedCollected: 0,
        notesCount: 0,
      };
    });

    if (info && info.nickname) return info;

    // Last resort: try extracting from page title
    const title = await page.title();
    const nickname = title.split(' - ')[0]?.trim() || title.split('|')[0]?.trim() || '';

    return {
      nickname,
      xhsId: userId,
      avatarUrl: '',
      bio: '',
      location: '',
      followers: 0,
      following: 0,
      likedCollected: 0,
      notesCount: 0,
    };
  } catch {
    return null;
  }
}

async function parsePostsFromDom(page: any): Promise<PostData[]> {
  try {
    // Scroll down to load more notes
    await page.evaluate(async () => {
      for (let i = 0; i < 10; i++) {
        window.scrollBy(0, 800);
        await new Promise(r => setTimeout(r, 800));
      }
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 500));
    });

    const posts = await page.evaluate(() => {
      // Debug: dump structure of found items
      const debug: string[] = [];

      // Try multiple selectors for note items
      const selectors = [
        'section.note-item',
        '[class*="note-item"]',
        '[class*="card"]',
        '.note-item',
        'a[class*="cover"]',
        '[data-note-id]',
        'figure',
        'div[class*="item"]',
      ];

      let items: Element[] = [];
      for (const sel of selectors) {
        const found = Array.from(document.querySelectorAll(sel));
        debug.push(`${sel}: ${found.length} items`);
        if (found.length > 2) {
          items = found;
          break;
        }
      }

      // Debug first item structure
      if (items.length > 0) {
        const first = items[0];
        debug.push('first-item-html: ' + first.outerHTML.substring(0, 500));
        const imgs = Array.from(first.querySelectorAll('img')).map(img => ({
          src: img.getAttribute('src')?.substring(0, 50),
          dataSrc: img.getAttribute('data-src')?.substring(0, 50),
          dataLazy: img.getAttribute('data-lazy-src')?.substring(0, 50),
          srcset: img.getAttribute('srcset')?.substring(0, 50),
        }));
        debug.push('imgs: ' + JSON.stringify(imgs));
      }

      // Helper to extract image URL from various sources
      function getCoverUrl(item: Element): string {
        // Try all img elements
        const imgs = Array.from(item.querySelectorAll('img'));
        for (const img of imgs) {
          const attrs = ['data-src', 'data-lazy-src', 'data-original', 'src'];
          for (const attr of attrs) {
            const val = img.getAttribute(attr);
            if (val && val.startsWith('http')) return val;
          }
          // Try srcset
          const srcset = img.getAttribute('srcset');
          if (srcset) {
            const first = srcset.split(',')[0]?.trim().split(' ')[0];
            if (first && first.startsWith('http')) return first;
          }
        }
        // Try background-image style
        const styleEl = item.querySelector('[style*="background-image"]') || item;
        const style = styleEl.getAttribute('style') || '';
        const match = style.match(/url\(["']?([^"')]+)["']?\)/);
        if (match) return match[1];
        return '';
      }

      // Helper to extract interaction counts
      function parseCount(text: string): number {
        if (!text) return 0;
        const cleaned = text.trim().replace(/[^0-9.万千kKM]/g, '');
        if (cleaned.includes('万') || cleaned.includes('w')) {
          return Math.round(parseFloat(cleaned) * 10000);
        }
        return parseInt(cleaned.replace(/[kK]/g, '000')) || 0;
      }

      return items.map((item) => {
        const titleEl = item.querySelector('[class*="title"], [class*="name"], h3, .title');
        const likesEl = item.querySelector('[class*="like"], [class*="heart"]');
        const commentsEl = item.querySelector('[class*="comment"]');
        const dateEl = item.querySelector('[class*="date"], [class*="time"]');

        // Extract note ID from URL or data attribute
        const linkEl = item.querySelector('a[href*="/explore/"]');
        const href = linkEl?.getAttribute('href') || '';
        const noteIdMatch = href.match(/\/explore\/([a-f0-9]+)/);
        const noteId = noteIdMatch ? noteIdMatch[1] : (item as HTMLElement).dataset?.noteId || '';

        return {
          xhsPostId: noteId,
          title: titleEl?.textContent?.trim() || '',
          content: '',
          coverUrl: getCoverUrl(item),
          likes: parseCount(likesEl?.textContent || ''),
          comments: parseCount(commentsEl?.textContent || ''),
          collects: 0,
          shares: 0,
          tags: [],
          postType: item.querySelector('video, [class*="video"]') ? 'video' : 'normal',
          publishDate: dateEl?.textContent?.trim() || '',
          _debug: debug,
        };
      }).filter((p) => p.title && p.title.length > 1);
    });
    return posts as PostData[];
  } catch {
    return [];
  }
}

async function parseNoteFromDom(page: any, noteId: string) {
  try {
    const info = await page.evaluate(() => {
      // Try to extract from SSR state or page content
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        if (s.textContent?.includes('__INITIAL_SSR_STATE__')) {
          try {
            const match = s.textContent?.match(/__INITIAL_SSR_STATE__\s*=\s*({[\s\S]*?})\s*(?:;|$)/);
            if (match) {
              const state = JSON.parse(match[1]);
              const note = state.note?.noteDetailMap?.[state.note?.currentNoteId]?.note || {};
              return {
                title: note.title || note.display_title || '',
                content: note.desc || '',
                authorNickname: note.user?.nickname || '',
              };
            }
          } catch {
            // ignore
          }
        }
      }
      return {
        title: document.querySelector('h1')?.textContent?.trim() || '',
        content: '',
        authorNickname: '',
      };
    });

    return {
      noteId,
      title: info.title || '',
      content: info.content || '',
      coverUrl: '',
      imageUrls: [],
      videoUrl: '',
      likes: 0,
      comments: 0,
      collects: 0,
      shares: 0,
      tags: [],
      postType: 'normal',
      publishDate: '',
      authorNickname: info.authorNickname || '',
      authorAvatar: '',
      commentCount: 0,
      // Media download fields
      imagePaths: [],
      videoPath: '',
      videoThumbnail: '',
    };
  } catch {
    return {
      noteId,
      title: '',
      content: '',
      coverUrl: '',
      imageUrls: [],
      videoUrl: '',
      likes: 0,
      comments: 0,
      collects: 0,
      shares: 0,
      tags: [],
      postType: 'normal',
      publishDate: '',
      authorNickname: '',
      authorAvatar: '',
      commentCount: 0,
      // Media download fields
      imagePaths: [],
      videoPath: '',
      videoThumbnail: '',
    };
  }
}
