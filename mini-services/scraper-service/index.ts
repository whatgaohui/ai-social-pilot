import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PrismaClient } from '@prisma/client';

// ─── Prisma Client Setup ──────────────────────────────────────────────────
const prisma = new PrismaClient({
  datasources: {
    db: { url: 'file:/home/z/my-project/db/custom.db' },
  },
});

// ─── Hono App ─────────────────────────────────────────────────────────────
const app = new Hono();

app.use('*', cors());

// ─── Constants ────────────────────────────────────────────────────────────
const XHS_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Referer': 'https://www.xiaohongshu.com/',
  'Sec-Ch-Ua':
    '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

// ─── Types ────────────────────────────────────────────────────────────────
interface XhsProfile {
  nickname: string;
  avatarUrl: string;
  bio: string;
  followers: number;
  following: number;
  postsCount: number;
  noteCount: number;
}

interface XhsNote {
  noteId: string;
  title: string;
  content: string;
  type: string;
  likes: number;
  collected: number;
  comments: number;
  shares: number;
  publishDate: string;
  imageUrl: string;
  tags: string[];
}

interface XhsNoteDetail {
  noteId: string;
  likes: number;
  comments: number;
  shares: number;
  collected: number;
  topComments: { user: string; content: string; likes: number }[];
}

interface ImportPost {
  topic: string;
  content: string;
  platform: string;
  scheduledDate: string;
  contentType: string;
  likes: number;
  comments: number;
  shares: number;
  favorites: number;
  views: number;
  status: string;
  imageUrl: string;
  tags: string;
}

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'scraper' });
});

// ─── XHS Profile Scraper ──────────────────────────────────────────────────
app.post('/api/scrape/xhs/profile', async (c) => {
  try {
    const body = await c.req.json<{ homeUrl: string }>();
    const { homeUrl } = body;

    if (!homeUrl) {
      return c.json({ error: 'homeUrl is required' }, 400);
    }

    console.log(`[XHS Profile] Scraping: ${homeUrl}`);

    const response = await fetch(homeUrl, {
      headers: XHS_HEADERS,
      redirect: 'follow',
    });

    if (!response.ok) {
      return c.json(
        { error: `Failed to fetch page: ${response.status}` },
        500
      );
    }

    const html = await response.text();
    console.log(`[XHS Profile] Fetched ${html.length} chars`);

    // Strategy 1: Parse ISSR_SCRIPT tag for embedded state data
    let profile: Partial<XhsProfile> = {};

    const issrMatch = html.match(
      /<script\s+id="ISSR_SCRIPT"[^>]*>([\s\S]*?)<\/script>/
    );
    if (issrMatch) {
      console.log('[XHS Profile] Found ISSR_SCRIPT data');
      try {
        const jsonStr = issrMatch[1].trim();
        const data = JSON.parse(jsonStr);

        // Navigate XHS's deeply nested data structure
        const userSection = extractNestedValue(data, 'user');
        if (userSection) {
          profile = {
            nickname:
              extractNestedValue(userSection, 'nickname') ||
              extractNestedValue(userSection, 'nickName') ||
              '',
            avatarUrl:
              extractNestedValue(userSection, 'avatar') ||
              extractNestedValue(userSection, 'image') ||
              '',
            bio:
              extractNestedValue(userSection, 'desc') ||
              extractNestedValue(userSection, 'description') ||
              '',
            followers: toNumber(
              extractNestedValue(userSection, 'fans') ||
                extractNestedValue(userSection, 'fansCount') ||
                extractNestedValue(userSection, 'followerCount') ||
                0
            ),
            following: toNumber(
              extractNestedValue(userSection, 'follows') ||
                extractNestedValue(userSection, 'followCount') ||
                0
            ),
            postsCount: toNumber(
              extractNestedValue(userSection, 'notes') ||
                extractNestedValue(userSection, 'notesCount') ||
                extractNestedValue(userSection, 'postCount') ||
                0
            ),
            noteCount: toNumber(
              extractNestedValue(userSection, 'interaction') ||
                extractNestedValue(userSection, 'interactCount') ||
                0
            ),
          };
        }
      } catch (e) {
        console.log('[XHS Profile] Failed to parse ISSR_SCRIPT JSON:', e);
      }
    }

    // Strategy 2: Parse meta tags and og tags as fallback
    if (!profile.nickname) {
      console.log('[XHS Profile] Falling back to meta tags');
      const getMeta = (name: string): string => {
        const selectors = [
          `meta[name="${name}"]`,
          `meta[property="${name}"]`,
        ];
        for (const sel of selectors) {
          const match = html.match(
            new RegExp(
              `<${sel}\\s+content=["']([^"']*?)["']`,
              'i'
            )
          );
          if (match) return match[1];
        }
        return '';
      };

      const ogImage = getMeta('og:image');
      const ogTitle = getMeta('og:title');
      const ogDesc = getMeta('og:description');

      // Try to find user info in window.__INITIAL_STATE__ or similar
      const stateMatch = html.match(
        /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*<\/script>/
      );
      if (stateMatch) {
        try {
          const stateData = JSON.parse(stateMatch[1]);
          const user =
            stateData?.user?.userPageMeta ||
            stateData?.user?.userInfo ||
            stateData?.user;
          if (user) {
            profile.nickname =
              user?.nickname || user?.nickName || ogTitle || '';
            profile.avatarUrl =
              user?.avatar || user?.image || ogImage || '';
            profile.bio = user?.desc || user?.description || ogDesc || '';
            profile.followers = toNumber(
              user?.fans || user?.fansCount || 0
            );
            profile.following = toNumber(
              user?.follows || user?.followCount || 0
            );
            profile.postsCount = toNumber(
              user?.notes || user?.notesCount || 0
            );
            profile.noteCount = toNumber(
              user?.interaction || user?.interactCount || 0
            );
          }
        } catch (e) {
          console.log(
            '[XHS Profile] Failed to parse __INITIAL_STATE__:',
            e
          );
        }
      }

      // Final fallback from meta tags
      profile.nickname = profile.nickname || ogTitle || 'Unknown';
      profile.avatarUrl = profile.avatarUrl || ogImage || '';
      profile.bio = profile.bio || ogDesc || '';
    }

    // Strategy 3: Regex-based extraction from raw HTML
    if (!profile.nickname || profile.nickname === 'Unknown') {
      console.log(
        '[XHS Profile] Falling back to regex extraction'
      );
      const nicknameMatch = html.match(
        /"nickname"\s*:\s*"([^"]+)"/
      );
      const avatarMatch = html.match(
        /"avatar"\s*:\s*"([^"]+)"/
      );
      const descMatch = html.match(/"desc"\s*:\s*"([^"]+)"/);
      const fansMatch = html.match(/"fans"\s*:\s*(\d+)/);
      const followsMatch = html.match(/"follows"\s*:\s*(\d+)/);
      const notesMatch = html.match(/"notes"\s*:\s*(\d+)/);

      if (nicknameMatch) {
        profile.nickname = nicknameMatch[1];
        profile.avatarUrl = avatarMatch?.[1] || profile.avatarUrl || '';
        profile.bio = descMatch?.[1] || profile.bio || '';
        profile.followers = toNumber(fansMatch?.[1] || 0);
        profile.following = toNumber(followsMatch?.[1] || 0);
        profile.postsCount = toNumber(notesMatch?.[1] || 0);
        profile.noteCount = profile.postsCount; // Approximation
      }
    }

    console.log('[XHS Profile] Extracted:', profile.nickname);

    return c.json({
      nickname: profile.nickname || 'Unknown',
      avatarUrl: profile.avatarUrl || '',
      bio: profile.bio || '',
      followers: profile.followers || 0,
      following: profile.following || 0,
      postsCount: profile.postsCount || 0,
      noteCount: profile.noteCount || 0,
    });
  } catch (error) {
    console.error('[XHS Profile] Error:', error);
    return c.json(
      { error: `Scraping failed: ${getErrorMessage(error)}` },
      500
    );
  }
});

// ─── XHS Notes Scraper ────────────────────────────────────────────────────
app.post('/api/scrape/xhs/notes', async (c) => {
  try {
    const body = await c.req.json<{
      homeUrl: string;
      limit?: number;
    }>();
    const { homeUrl, limit = 30 } = body;

    if (!homeUrl) {
      return c.json({ error: 'homeUrl is required' }, 400);
    }

    console.log(
      `[XHS Notes] Scraping notes from: ${homeUrl} (limit: ${limit})`
    );

    // Extract user_id from URL
    const userIdMatch = homeUrl.match(
      /\/user\/profile\/([a-zA-Z0-9]+)/
    );
    if (!userIdMatch) {
      return c.json(
        { error: 'Invalid XHS profile URL format' },
        400
      );
    }
    const userId = userIdMatch[1];

    // Fetch the profile page to get notes data
    const response = await fetch(homeUrl, {
      headers: XHS_HEADERS,
      redirect: 'follow',
    });

    if (!response.ok) {
      return c.json(
        { error: `Failed to fetch page: ${response.status}` },
        500
      );
    }

    const html = await response.text();
    console.log(`[XHS Notes] Fetched ${html.length} chars`);

    const notes: XhsNote[] = [];

    // Strategy 1: Parse from ISSR_SCRIPT
    const issrMatch = html.match(
      /<script\s+id="ISSR_SCRIPT"[^>]*>([\s\S]*?)<\/script>/
    );
    if (issrMatch) {
      console.log('[XHS Notes] Found ISSR_SCRIPT, extracting notes');
      try {
        const jsonStr = issrMatch[1].trim();
        const data = JSON.parse(jsonStr);

        // XHS stores notes in various possible paths
        const notesList = extractNotesFromData(data);
        if (notesList && notesList.length > 0) {
          console.log(
            `[XHS Notes] Found ${notesList.length} notes from ISSR_SCRIPT`
          );
          for (const note of notesList.slice(0, limit)) {
            notes.push({
              noteId:
                extractNestedValue(note, 'noteId') ||
                extractNestedValue(note, 'id') ||
                extractNestedValue(note, 'note_id') ||
                '',
              title:
                extractNestedValue(note, 'title') ||
                extractNestedValue(note, 'displayTitle') ||
                '',
              content:
                extractNestedValue(note, 'desc') ||
                extractNestedValue(note, 'description') ||
                '',
              type:
                extractNestedValue(note, 'type') ||
                extractNestedValue(note, 'noteType') ||
                'normal',
              likes: toNumber(
                extractNestedValue(note, 'likes') ||
                  extractNestedValue(note, 'likedCount') ||
                  0
              ),
              collected: toNumber(
                extractNestedValue(note, 'collected') ||
                  extractNestedValue(note, 'collectCount') ||
                  0
              ),
              comments: toNumber(
                extractNestedValue(note, 'comments') ||
                  extractNestedValue(note, 'commentCount') ||
                  0
              ),
              shares: toNumber(
                extractNestedValue(note, 'shares') ||
                  extractNestedValue(note, 'shareCount') ||
                  0
              ),
              publishDate:
                extractNestedValue(note, 'time') ||
                extractNestedValue(note, 'timestamp') ||
                extractNestedValue(note, 'lastUpdateTime') ||
                '',
              imageUrl:
                extractNestedValue(note, 'imageList')?.[0] ||
                extractNestedValue(note, 'image') ||
                extractNestedValue(note, 'cover') ||
                '',
              tags:
                extractNestedValue(note, 'tagList') ||
                extractNestedValue(note, 'tags') ||
                [],
            });
          }
        }
      } catch (e) {
        console.log(
          '[XHS Notes] Failed to parse ISSR_SCRIPT JSON:',
          e
        );
      }
    }

    // Strategy 2: Parse from __INITIAL_STATE__
    if (notes.length === 0) {
      console.log(
        '[XHS Notes] Trying __INITIAL_STATE__ fallback'
      );
      const stateMatch = html.match(
        /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*<\/script>/
      );
      if (stateMatch) {
        try {
          const stateData = JSON.parse(stateMatch[1]);
          const notesSection =
            stateData?.user?.notesData ||
            stateData?.user?.notes ||
            stateData?.notes ||
            stateData?.noteList;

          if (Array.isArray(notesSection)) {
            console.log(
              `[XHS Notes] Found ${notesSection.length} notes from __INITIAL_STATE__`
            );
            for (const note of notesSection.slice(0, limit)) {
              notes.push(normalizeNote(note));
            }
          }
        } catch (e) {
          console.log(
            '[XHS Notes] Failed to parse __INITIAL_STATE__:',
            e
          );
        }
      }
    }

    // Strategy 3: Regex-based extraction for note cards
    if (notes.length === 0) {
      console.log('[XHS Notes] Trying regex extraction');
      // XHS note cards often contain note IDs and basic info
      const noteCardRegex =
        /"noteId"\s*:\s*"([a-f0-9]+)"[^}]*?"title"\s*:\s*"([^"]*?)"[^}]*?"desc"\s*:\s*"([^"]*?)"/g;
      let match;
      while ((match = noteCardRegex.exec(html)) !== null) {
        if (notes.length >= limit) break;
        notes.push({
          noteId: match[1],
          title: decodeUnicodeEscapes(match[2]),
          content: decodeUnicodeEscapes(match[3]),
          type: 'normal',
          likes: 0,
          collected: 0,
          comments: 0,
          shares: 0,
          publishDate: '',
          imageUrl: '',
          tags: [],
        });
      }
    }

    console.log(`[XHS Notes] Total extracted: ${notes.length}`);

    return c.json({ notes });
  } catch (error) {
    console.error('[XHS Notes] Error:', error);
    return c.json(
      { error: `Scraping failed: ${getErrorMessage(error)}` },
      500
    );
  }
});

// ─── XHS Notes Detail Scraper ─────────────────────────────────────────────
app.post('/api/scrape/xhs/notes-detail', async (c) => {
  try {
    const body = await c.req.json<{ noteIds: string[] }>();
    const { noteIds } = body;

    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      return c.json({ error: 'noteIds array is required' }, 400);
    }

    console.log(
      `[XHS Detail] Fetching details for ${noteIds.length} notes`
    );

    const details: XhsNoteDetail[] = [];

    for (const noteId of noteIds) {
      try {
        console.log(`[XHS Detail] Processing note: ${noteId}`);
        const noteUrl = `https://www.xiaohongshu.com/explore/${noteId}`;

        const response = await fetch(noteUrl, {
          headers: XHS_HEADERS,
          redirect: 'follow',
        });

        if (!response.ok) {
          console.log(
            `[XHS Detail] Failed to fetch note ${noteId}: ${response.status}`
          );
          details.push({
            noteId,
            likes: 0,
            comments: 0,
            shares: 0,
            collected: 0,
            topComments: [],
          });
          continue;
        }

        const html = await response.text();
        const detail = parseNoteDetail(html, noteId);
        details.push(detail);
      } catch (noteError) {
        console.error(
          `[XHS Detail] Error processing note ${noteId}:`,
          noteError
        );
        details.push({
          noteId,
          likes: 0,
          comments: 0,
          shares: 0,
          collected: 0,
          topComments: [],
        });
      }

      // Small delay between requests to avoid rate limiting
      await sleep(500);
    }

    console.log(`[XHS Detail] Processed ${details.length} notes`);
    return c.json({ details });
  } catch (error) {
    console.error('[XHS Detail] Error:', error);
    return c.json(
      { error: `Scraping failed: ${getErrorMessage(error)}` },
      500
    );
  }
});

// ─── WeChat Manual Import ─────────────────────────────────────────────────
app.post('/api/scrape/wechat/manual', async (c) => {
  try {
    const body = await c.req.json<{
      posts: {
        content: string;
        date: string;
        likes: number;
        comments: number;
        shares: number;
      }[];
    }>();
    const { posts } = body;

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return c.json({ error: 'posts array is required' }, 400);
    }

    console.log(`[WeChat Manual] Validating ${posts.length} posts`);

    const validated = [];
    const errors: string[] = [];

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const postErrors: string[] = [];

      if (!post.content || typeof post.content !== 'string') {
        postErrors.push('content is required and must be a string');
      }

      if (!post.date || typeof post.date !== 'string') {
        postErrors.push('date is required and must be a string');
      }

      if (postErrors.length > 0) {
        errors.push(`Post ${i}: ${postErrors.join(', ')}`);
        continue;
      }

      validated.push({
        platform: 'wechat',
        contentType: 'text',
        topic: post.content.slice(0, 50),
        content: post.content,
        scheduledDate: post.date,
        likes: toNumber(post.likes) || 0,
        comments: toNumber(post.comments) || 0,
        shares: toNumber(post.shares) || 0,
        favorites: 0,
        views: 0,
        status: 'published',
        imageUrl: '',
        tags: '',
      });
    }

    console.log(
      `[WeChat Manual] Validated: ${validated.length}, Errors: ${errors.length}`
    );

    return c.json({
      posts: validated,
      total: validated.length,
      errors,
    });
  } catch (error) {
    console.error('[WeChat Manual] Error:', error);
    return c.json(
      { error: `Validation failed: ${getErrorMessage(error)}` },
      500
    );
  }
});

// ─── Import to Database ──────────────────────────────────────────────────
app.post('/api/import-to-db', async (c) => {
  try {
    const body = await c.req.json<{
      accountId: string;
      posts: ImportPost[];
    }>();
    const { accountId, posts } = body;

    if (!accountId) {
      return c.json({ error: 'accountId is required' }, 400);
    }

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return c.json({ error: 'posts array is required' }, 400);
    }

    console.log(
      `[DB Import] Importing ${posts.length} posts for account: ${accountId}`
    );

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Group posts by month for ContentPlan creation
    const monthGroups = new Map<string, ImportPost[]>();
    for (const post of posts) {
      const month = post.scheduledDate?.slice(0, 7) || new Date().toISOString().slice(0, 7);
      if (!monthGroups.has(month)) {
        monthGroups.set(month, []);
      }
      monthGroups.get(month)!.push(post);
    }

    for (const [month, monthPosts] of monthGroups) {
      console.log(
        `[DB Import] Processing month: ${month} (${monthPosts.length} posts)`
      );

      try {
        // Find or create ContentPlan for this month
        let plan = await prisma.contentPlan.findFirst({
          where: { month },
        });

        if (!plan) {
          plan = await prisma.contentPlan.create({
            data: {
              month,
              theme: `Content for ${month}`,
              status: 'active',
            },
          });
          console.log(`[DB Import] Created ContentPlan for ${month}`);
        }

        // Check for existing posts to avoid duplicates
        const existingPosts = await prisma.contentPost.findMany({
          where: { planId: plan.id },
          select: {
            scheduledDate: true,
            platform: true,
            content: true,
          },
        });

        for (const post of monthPosts) {
          try {
            // Check for duplicates: same date + same platform + first 50 chars of content
            const contentPrefix = (post.content || '').slice(0, 50);
            const isDuplicate = existingPosts.some(
              (existing) =>
                existing.scheduledDate === post.scheduledDate &&
                existing.platform === post.platform &&
                (existing.content || '').slice(0, 50) === contentPrefix
            );

            if (isDuplicate) {
              console.log(
                `[DB Import] Skipping duplicate: ${post.scheduledDate} - ${contentPrefix.slice(0, 30)}...`
              );
              skipped++;
              continue;
            }

            await prisma.contentPost.create({
              data: {
                planId: plan.id,
                scheduledDate: post.scheduledDate || new Date().toISOString().slice(0, 10),
                platform: post.platform || 'wechat',
                contentType: post.contentType || 'text',
                topic: post.topic || '',
                content: post.content || '',
                status: post.status || 'planned',
                likes: toNumber(post.likes) || 0,
                comments: toNumber(post.comments) || 0,
                shares: toNumber(post.shares) || 0,
                views: toNumber(post.views) || 0,
                favorites: toNumber(post.favorites) || 0,
              },
            });

            console.log(
              `[DB Import] Imported: ${post.scheduledDate} - ${(post.topic || post.content || '').slice(0, 30)}...`
            );
            imported++;
          } catch (postError) {
            const errMsg = getErrorMessage(postError);
            console.error(`[DB Import] Error importing post:`, errMsg);
            errors.push(
              `Post "${(post.topic || '').slice(0, 30)}": ${errMsg}`
            );
          }
        }
      } catch (monthError) {
        const errMsg = getErrorMessage(monthError);
        console.error(
          `[DB Import] Error for month ${month}:`,
          errMsg
        );
        errors.push(`Month ${month}: ${errMsg}`);
      }
    }

    console.log(
      `[DB Import] Complete - Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors.length}`
    );

    return c.json({ imported, skipped, errors });
  } catch (error) {
    console.error('[DB Import] Error:', error);
    return c.json(
      { error: `Import failed: ${getErrorMessage(error)}` },
      500
    );
  }
});

// ─── Helper Functions ─────────────────────────────────────────────────────

/**
 * Recursively extract a value from a nested object using a list of possible keys
 */
function extractNestedValue(
  obj: unknown,
  key: string
): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return undefined;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = extractNestedValue(item, key);
      if (result !== undefined) return result;
    }
    return undefined;
  }

  const record = obj as Record<string, unknown>;

  // Direct match
  if (record[key] !== undefined) {
    return record[key];
  }

  // Search nested objects
  for (const value of Object.values(record)) {
    if (typeof value === 'object' && value !== null) {
      const result = extractNestedValue(value, key);
      if (result !== undefined) return result;
    }
  }

  return undefined;
}

/**
 * Extract notes array from deeply nested XHS data
 */
function extractNotesFromData(data: unknown): unknown[] {
  if (!data || typeof data !== 'object') return [];

  // Common paths where XHS stores notes
  const possiblePaths = [
    'notes',
    'noteList',
    'notesData',
    'userNotes',
    'postList',
  ];

  const found: unknown[] = [];

  for (const path of possiblePaths) {
    const value = extractNestedValue(data, path);
    if (Array.isArray(value) && value.length > 0) {
      found.push(...value);
      break;
    }
  }

  if (found.length > 0) return found;

  // Deep search for arrays that have noteId or id fields
  const arrays = extractArrays(data);
  for (const arr of arrays) {
    if (arr.length > 0) {
      const first = arr[0];
      if (
        typeof first === 'object' &&
        first !== null &&
        ('noteId' in first || 'id' in first)
      ) {
        return arr;
      }
    }
  }

  return found;
}

/**
 * Recursively find all arrays in an object
 */
function extractArrays(obj: unknown): unknown[][] {
  if (obj === null || obj === undefined) return [];
  if (Array.isArray(obj)) return [obj];

  if (typeof obj === 'object') {
    const result: unknown[][] = [];
    for (const value of Object.values(obj as Record<string, unknown>)) {
      result.push(...extractArrays(value));
    }
    return result;
  }

  return [];
}

/**
 * Normalize a note object from various formats
 */
function normalizeNote(note: Record<string, unknown>): XhsNote {
  return {
    noteId:
      (note.noteId as string) ||
      (note.id as string) ||
      (note.note_id as string) ||
      '',
    title:
      (note.title as string) ||
      (note.displayTitle as string) ||
      '',
    content:
      (note.desc as string) ||
      (note.description as string) ||
      (note.content as string) ||
      '',
    type:
      (note.type as string) ||
      (note.noteType as string) ||
      'normal',
    likes: toNumber(note.likes || note.likedCount || 0),
    collected: toNumber(
      note.collected || note.collectCount || 0
    ),
    comments: toNumber(
      note.comments || note.commentCount || 0
    ),
    shares: toNumber(note.shares || note.shareCount || 0),
    publishDate:
      (note.time as string) ||
      (note.timestamp as string) ||
      (note.lastUpdateTime as string) ||
      '',
    imageUrl:
      (note.image as string) ||
      (note.cover as string) ||
      '',
    tags:
      Array.isArray(note.tagList)
        ? (note.tagList as string[])
        : Array.isArray(note.tags)
          ? (note.tags as string[])
          : [],
  };
}

/**
 * Parse a note detail page to extract interaction data
 */
function parseNoteDetail(
  html: string,
  noteId: string
): XhsNoteDetail {
  const detail: XhsNoteDetail = {
    noteId,
    likes: 0,
    comments: 0,
    shares: 0,
    collected: 0,
    topComments: [],
  };

  // Strategy 1: ISSR_SCRIPT
  const issrMatch = html.match(
    /<script\s+id="ISSR_SCRIPT"[^>]*>([\s\S]*?)<\/script>/
  );
  if (issrMatch) {
    try {
      const data = JSON.parse(issrMatch[1].trim());
      detail.likes = toNumber(
        extractNestedValue(data, 'likes') ||
          extractNestedValue(data, 'likedCount') ||
          0
      );
      detail.collected = toNumber(
        extractNestedValue(data, 'collected') ||
          extractNestedValue(data, 'collectCount') ||
          0
      );
      detail.comments = toNumber(
        extractNestedValue(data, 'comments') ||
          extractNestedValue(data, 'commentCount') ||
          0
      );
      detail.shares = toNumber(
        extractNestedValue(data, 'shares') ||
          extractNestedValue(data, 'shareCount') ||
          0
      );

      // Extract top comments
      const commentsData = extractNestedValue(data, 'comments');
      if (Array.isArray(commentsData)) {
        detail.topComments = commentsData
          .slice(0, 10)
          .map((cmt: unknown) => {
            const c = cmt as Record<string, unknown>;
            return {
              user:
                (extractNestedValue(c, 'nickname') as string) ||
                (extractNestedValue(c, 'userName') as string) ||
                'Anonymous',
              content:
                (extractNestedValue(c, 'content') as string) ||
                (extractNestedValue(c, 'desc') as string) ||
                '',
              likes: toNumber(
                extractNestedValue(c, 'likeCount') ||
                  extractNestedValue(c, 'likedCount') ||
                  0
              ),
            };
          });
      }
    } catch (e) {
      console.log(
        `[XHS Detail] Failed to parse ISSR for note ${noteId}:`,
        e
      );
    }
  }

  // Strategy 2: __INITIAL_STATE__
  if (detail.likes === 0) {
    const stateMatch = html.match(
      /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*<\/script>/
    );
    if (stateMatch) {
      try {
        const stateData = JSON.parse(stateMatch[1]);
        const noteData =
          stateData?.note?.noteDetailMap ||
          stateData?.note?.noteData ||
          stateData?.note;

        if (noteData) {
          detail.likes = toNumber(
            extractNestedValue(noteData, 'likes') ||
              extractNestedValue(noteData, 'likedCount') ||
              0
          );
          detail.collected = toNumber(
            extractNestedValue(noteData, 'collected') ||
              extractNestedValue(noteData, 'collectCount') ||
              0
          );
          detail.comments = toNumber(
            extractNestedValue(noteData, 'comments') ||
              extractNestedValue(noteData, 'commentCount') ||
              0
          );
          detail.shares = toNumber(
            extractNestedValue(noteData, 'shares') ||
              extractNestedValue(noteData, 'shareCount') ||
              0
          );
        }
      } catch (e) {
        console.log(
          `[XHS Detail] Failed to parse __INITIAL_STATE__ for note ${noteId}:`,
          e
        );
      }
    }
  }

  // Strategy 3: Regex fallback
  if (detail.likes === 0) {
    const likesMatch = html.match(
      /"likedCount"\s*:\s*"(\d+)"/
    );
    const collectMatch = html.match(
      /"collected"\s*:\s*"(\d+)"/
    );
    const commentMatch = html.match(
      /"commentCount"\s*:\s*"(\d+)"/
    );
    const shareMatch = html.match(
      /"shareCount"\s*:\s*"(\d+)"/
    );

    detail.likes = toNumber(likesMatch?.[1] || 0);
    detail.collected = toNumber(collectMatch?.[1] || 0);
    detail.comments = toNumber(commentMatch?.[1] || 0);
    detail.shares = toNumber(shareMatch?.[1] || 0);
  }

  return detail;
}

/**
 * Convert a value to a number
 */
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value.replace(/[^\d.-]/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Decode unicode escape sequences in a string
 */
function decodeUnicodeEscapes(str: string): string {
  return str.replace(
    /\\u([0-9a-fA-F]{4})/g,
    (_, hex) => String.fromCharCode(parseInt(hex, 16))
  );
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}

// ─── Start Server ─────────────────────────────────────────────────────────
const PORT = 3003;

console.log(`[Scraper Service] Starting on port ${PORT}...`);

Bun.serve({
  port: PORT,
  fetch: app.fetch,
});

console.log(`[Scraper Service] Running on http://localhost:${PORT}`);
