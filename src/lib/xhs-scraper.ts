import ZAI from 'z-ai-web-dev-sdk';
import type { ScrapeResult } from '@/types';

// ─── URL Parsing Helpers ──────────────────────────────────────────────────

/**
 * Extract user ID from a Xiaohongshu profile URL.
 * Supports:
 *   - https://www.xiaohongshu.com/user/profile/{userId}
 *   - https://xhslink.com/{shortCode}
 *   - Any URL containing a user ID pattern
 */
function extractUserIdFromUrl(url: string): string {
  // Standard profile URL pattern
  const profileMatch = url.match(
    /xiaohongshu\.com\/user\/profile\/([a-f0-9]{24}|[A-Za-z0-9_-]+)/
  );
  if (profileMatch) return profileMatch[1];

  // Short link pattern (xhslink.com)
  const shortMatch = url.match(/xhslink\.com\/([A-Za-z0-9]+)/);
  if (shortMatch) return shortMatch[1];

  // Try to extract any trailing alphanumeric ID
  const genericMatch = url.match(/\/([a-f0-9]{24})(?:\?|$|\/)/);
  if (genericMatch) return genericMatch[1];

  return '';
}

/**
 * Extract Chinese characters that might indicate a username from a URL or text.
 */
function extractChineseUsername(text: string): string {
  const match = text.match(/[\u4e00-\u9fff]{2,20}/);
  return match ? match[0] : '';
}

/**
 * Build a search-friendly query string from a XHS URL.
 */
function buildSearchQuery(url: string): string {
  const userId = extractUserIdFromUrl(url);
  const chineseName = extractChineseUsername(url);
  const parts: string[] = ['小红书'];

  if (chineseName) {
    parts.push(chineseName);
  }
  if (userId) {
    parts.push(userId);
  }

  return parts.join(' ');
}

// ─── Strategy 1: page_reader ──────────────────────────────────────────────

interface PageReaderResult {
  success: boolean;
  html: string;
  pageTitle: string;
  warnings: string[];
}

async function tryPageReader(url: string): Promise<PageReaderResult> {
  const warnings: string[] = [];

  try {
    const zai = await ZAI.create();
    const result = await zai.functions.invoke('page_reader', { url });

    // Check for 403 or blocked response
    const statusCode = result.data?.statusCode || result.data?.status || 0;
    const html: string = result.data?.html || '';
    const pageTitle: string = result.data?.title || '';

    if (statusCode === 403 || (html && html.includes('403'))) {
      warnings.push('小红书网站屏蔽了直接访问（403），page_reader策略失败');
      return { success: false, html: '', pageTitle: '', warnings };
    }

    // Check for empty or very short responses (likely blocked)
    if (!html || html.length < 200) {
      warnings.push('page_reader返回内容为空或过短，可能被小红书屏蔽');
      return { success: false, html: '', pageTitle: '', warnings };
    }

    // Check for XHS-specific blocking indicators
    if (
      html.includes('Invalid X-Source') ||
      html.includes('访问受限') ||
      html.includes('验证码')
    ) {
      warnings.push('小红书网站屏蔽了直接访问，page_reader策略失败');
      return { success: false, html: '', pageTitle: '', warnings };
    }

    return { success: true, html, pageTitle, warnings };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : 'page_reader调用失败';
    warnings.push(`page_reader策略异常: ${msg}`);
    return { success: false, html: '', pageTitle: '', warnings };
  }
}

/**
 * Parse HTML from page_reader to extract profile data.
 */
function parseProfileHtml(
  html: string,
  pageTitle: string,
  url: string
): { userInfo: Record<string, unknown>; posts: Record<string, unknown>[] } {
  let userInfo: Record<string, unknown> = {};
  const posts: Record<string, unknown>[] = [];

  // Try __INITIAL_STATE__ pattern
  const initialStateMatch = html.match(
    /window\.__INITIAL_STATE__\s*=\s*(\{.+?\})\s*(?:<\/script>|\s*$)/s
  );
  if (initialStateMatch) {
    try {
      const sanitized = initialStateMatch[1]
        .replace(/:\s*undefined/g, ':null')
        .replace(/undefined/g, 'null');
      const state = JSON.parse(sanitized);

      const userState =
        state?.user?.userinfo || state?.user || state?.note?.user || null;
      if (userState) {
        userInfo = {
          nickname: userState.nickname || userState.nickName || '',
          xhsId: userState.userId || userState.xhsId || userState.redId || '',
          avatarUrl: userState.avatar || '',
          bio: userState.desc || userState.description || '',
          location: userState.location || userState.ipLocation || '',
          followers:
            Number(userState.followers) || Number(userState.fans) || 0,
          following:
            Number(userState.follows) || Number(userState.following) || 0,
          likedCollected:
            Number(userState.liked) ||
            Number(userState.likeCount) ||
            Number(userState.likedCollected) ||
            0,
          notesCount:
            Number(userState.notes) ||
            Number(userState.noteCount) ||
            Number(userState.notesCount) ||
            0,
        };
      }

      const notesData =
        state?.user?.notes || state?.notes || state?.note?.notes || [];
      if (Array.isArray(notesData)) {
        for (const note of notesData) {
          posts.push({
            xhsPostId: note.noteId || note.id || note.note_id || '',
            title: note.title || note.displayTitle || '',
            coverUrl: note.cover || note.coverUrl || note.imageList?.[0] || '',
            likes: Number(note.likes) || Number(note.likeCount) || 0,
            comments: Number(note.comments) || Number(note.commentCount) || 0,
            collects:
              Number(note.collects) ||
              Number(note.collectCount) ||
              Number(note.favorites) ||
              0,
            shares: Number(note.shares) || Number(note.shareCount) || 0,
            postType: note.type === 'video' ? 'video' : 'normal',
            publishDate: note.time || note.publishTime || note.createTime || '',
          });
        }
      }
    } catch (e) {
      console.error('Failed to parse __INITIAL_STATE__:', e);
    }
  }

  // Fallback: extract from title & HTML text
  if (!userInfo.nickname) {
    const nicknameMatch = pageTitle.match(/^(.+?)的小红书/);
    userInfo.nickname = nicknameMatch ? nicknameMatch[1] : '';
  }

  if (!userInfo.followers) {
    const fansMatch = html.match(/粉丝[^\d]*(\d+)/);
    if (fansMatch) userInfo.followers = parseInt(fansMatch[1], 10);
  }
  if (!userInfo.following) {
    const followMatch = html.match(/关注[^\d]*(\d+)/);
    if (followMatch) userInfo.following = parseInt(followMatch[1], 10);
  }
  if (!userInfo.likedCollected) {
    const likedMatch = html.match(/获赞[^\d]*(\d+)/);
    if (likedMatch) userInfo.likedCollected = parseInt(likedMatch[1], 10);
  }
  if (!userInfo.notesCount) {
    const notesMatch = html.match(/笔记[^\d]*(\d+)/);
    if (notesMatch) userInfo.notesCount = parseInt(notesMatch[1], 10);
  }

  if (!userInfo.bio) {
    const descMatch = html.match(
      /<meta\s+name="description"\s+content="([^"]+)"/
    );
    if (descMatch) userInfo.bio = descMatch[1];
  }

  // Fill in URL-based data
  if (!userInfo.xhsId) {
    userInfo.xhsId = extractUserIdFromUrl(url);
  }

  return { userInfo, posts };
}

// ─── Strategy 2: web_search + LLM analysis ────────────────────────────────

interface WebSearchResult {
  success: boolean;
  searchData: string;
  warnings: string[];
}

async function tryWebSearch(url: string): Promise<WebSearchResult> {
  const warnings: string[] = [];

  try {
    const zai = await ZAI.create();
    const searchQuery = buildSearchQuery(url);
    const userId = extractUserIdFromUrl(url);

    // Search 1: General search
    const searchResult1 = await zai.functions.invoke('web_search', {
      query: searchQuery,
      num: 10,
    });

    // Search 2: Site-specific search for notes
    let searchResult2: { data?: { results?: Array<{ snippet?: string; title?: string; url?: string }> } } | null = null;
    if (userId) {
      try {
        searchResult2 = await zai.functions.invoke('web_search', {
          query: `site:xiaohongshu.com ${userId} 笔记`,
          num: 10,
        });
      } catch {
        // Site-specific search might fail, that's okay
        warnings.push('站内搜索失败，仅使用通用搜索结果');
      }
    }

    // Combine search snippets
    const results1 = searchResult1?.data?.results || [];
    const results2 = searchResult2?.data?.results || [];
    const allResults = [...results1, ...results2];

    if (allResults.length === 0) {
      warnings.push('搜索引擎未返回相关结果');
      return { success: false, searchData: '', warnings };
    }

    // Build a text summary of all search results
    const searchSummary = allResults
      .map(
        (r: { title?: string; snippet?: string; url?: string }, i: number) =>
          `[${i + 1}] 标题: ${r.title || ''}\n    摘要: ${r.snippet || ''}\n    链接: ${r.url || ''}`
      )
      .join('\n\n');

    return { success: true, searchData: searchSummary, warnings };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : 'web_search调用失败';
    warnings.push(`web_search策略异常: ${msg}`);
    return { success: false, searchData: '', warnings };
  }
}

/**
 * Use LLM to analyze search results and extract structured profile data.
 */
async function analyzeSearchResultsWithLLM(
  searchData: string,
  url: string
): Promise<{
  userInfo: Record<string, unknown>;
  posts: Record<string, unknown>[];
}> {
  const userId = extractUserIdFromUrl(url);

  try {
    const zai = await ZAI.create();
    const llmResult = await zai.chat.completions.create({
      model: 'glm-4-flash',
      messages: [
        {
          role: 'system',
          content: `你是一个数据提取助手。根据搜索引擎返回的结果，提取小红书用户的个人资料信息。

请返回 ONLY 合法的 JSON，格式如下：
{
  "nickname": "用户昵称",
  "xhsId": "小红书用户ID",
  "bio": "个人简介",
  "location": "所在地",
  "followers": 0,
  "following": 0,
  "likedCollected": 0,
  "notesCount": 0,
  "posts": [
    {
      "xhsPostId": "笔记ID",
      "title": "笔记标题",
      "likes": 0,
      "comments": 0,
      "collects": 0,
      "shares": 0,
      "postType": "normal",
      "publishDate": ""
    }
  ]
}

如果某个字段无法从搜索结果中获取，使用空字符串或0。
如果搜索结果中提到了该用户的笔记/帖子，请在posts数组中列出。
已知URL中的用户ID: ${userId || '未知'}`,
        },
        {
          role: 'user',
          content: `请从以下搜索结果中提取小红书用户信息:\n\n${searchData.slice(0, 6000)}`,
        },
      ],
      temperature: 0.1,
    });

    const content = llmResult.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const { posts: extractedPosts, ...userInfo } = parsed;
      return {
        userInfo,
        posts: Array.isArray(extractedPosts) ? extractedPosts : [],
      };
    }
  } catch (e) {
    console.error('LLM analysis of search results failed:', e);
  }

  return { userInfo: {}, posts: [] };
}

// ─── Strategy 3: LLM-based profile analysis (fallback) ────────────────────

async function llmFallbackAnalysis(url: string): Promise<{
  userInfo: Record<string, unknown>;
  posts: Record<string, unknown>[];
  warnings: string[];
}> {
  const warnings: string[] = [
    '无法通过搜索引擎获取数据，使用LLM进行基础分析',
  ];
  const userId = extractUserIdFromUrl(url);
  const chineseName = extractChineseUsername(url);

  try {
    const zai = await ZAI.create();
    const llmResult = await zai.chat.completions.create({
      model: 'glm-4-flash',
      messages: [
        {
          role: 'system',
          content: `你是一个小红书数据分析助手。用户提供了小红书个人主页的URL，但无法直接访问该页面，也无法通过搜索引擎找到相关信息。

请根据URL结构进行基础分析，并返回 ONLY 合法的 JSON，格式如下：
{
  "nickname": "",
  "xhsId": "从URL提取的用户ID",
  "bio": "",
  "location": "",
  "followers": 0,
  "following": 0,
  "likedCollected": 0,
  "notesCount": 0,
  "suggestions": ["建议1", "建议2", "建议3"]
}

在suggestions中，请提供用户可以手动补充的信息建议。`,
        },
        {
          role: 'user',
          content: `请分析以下小红书URL:\n${url}\n\nURL中的用户ID: ${userId || '未知'}\nURL中可能的用户名: ${chineseName || '未知'}`,
        },
      ],
      temperature: 0.3,
    });

    const content = llmResult.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const { suggestions, ...userInfo } = parsed;

      if (Array.isArray(suggestions) && suggestions.length > 0) {
        warnings.push(
          `手动补充建议: ${suggestions.join('; ')}`
        );
      }

      return { userInfo, posts: [], warnings };
    }
  } catch (e) {
    console.error('LLM fallback analysis failed:', e);
    warnings.push('LLM分析也失败了，返回最基础的数据');
  }

  // Ultimate fallback: return whatever we can extract from the URL
  return {
    userInfo: {
      xhsId: userId,
      nickname: chineseName,
    },
    posts: [],
    warnings,
  };
}

// ─── Main Exported Functions ──────────────────────────────────────────────

/**
 * Scrape a Xiaohongshu user profile page.
 * Uses a multi-strategy approach: page_reader → web_search + LLM → LLM fallback.
 */
export async function scrapeXhsProfile(url: string): Promise<ScrapeResult> {
  const warnings: string[] = [];
  let scrapeMethod: ScrapeResult['scrapeMethod'] = 'page_reader';
  let userInfo: Record<string, unknown> = {};
  let posts: Record<string, unknown>[] = [];

  // ── Strategy 1: Try page_reader first ────────────────────────────────
  const pageResult = await tryPageReader(url);
  warnings.push(...pageResult.warnings);

  if (pageResult.success) {
    // Page reader succeeded — parse the HTML
    const parsed = parseProfileHtml(pageResult.html, pageResult.pageTitle, url);
    userInfo = parsed.userInfo;
    posts = parsed.posts;
    scrapeMethod = 'page_reader';

    // If we got meaningful data, return it
    if (userInfo.nickname || userInfo.xhsId) {
      const partialData = !userInfo.nickname || !userInfo.followers;
      if (partialData) {
        warnings.push('page_reader获取的数据不完整，部分字段缺失');
      }
      return buildScrapeResult(url, userInfo, posts, scrapeMethod, warnings, partialData);
    }

    // Page reader returned HTML but we couldn't extract data
    warnings.push('page_reader返回了页面但无法提取结构化数据，尝试搜索引擎策略');
  }

  // ── Strategy 2: web_search + LLM analysis ────────────────────────────
  const searchResult = await tryWebSearch(url);
  warnings.push(...searchResult.warnings);

  if (searchResult.success && searchResult.searchData) {
    const llmAnalysis = await analyzeSearchResultsWithLLM(
      searchResult.searchData,
      url
    );

    if (llmAnalysis.userInfo.nickname || llmAnalysis.userInfo.followers) {
      scrapeMethod = 'web_search';
      userInfo = { ...userInfo, ...llmAnalysis.userInfo };
      posts = [...posts, ...llmAnalysis.posts];
      warnings.push('小红书网站屏蔽了直接访问，使用了搜索引擎数据');

      const partialData =
        !userInfo.nickname ||
        !userInfo.followers ||
        !userInfo.bio;

      if (partialData) {
        warnings.push('搜索引擎获取的数据可能不完整，建议手动补充');
      }

      return buildScrapeResult(url, userInfo, posts, scrapeMethod, warnings, partialData);
    }

    warnings.push('搜索引擎返回了结果但LLM无法提取有效用户信息');
  }

  // ── Strategy 3: LLM-based profile analysis ──────────────────────────
  const fallbackResult = await llmFallbackAnalysis(url);
  warnings.push(...fallbackResult.warnings);
  userInfo = { ...userInfo, ...fallbackResult.userInfo };
  posts = [...posts, ...fallbackResult.posts];
  scrapeMethod = 'llm_fallback';

  return buildScrapeResult(url, userInfo, posts, scrapeMethod, warnings, true);
}

/**
 * Build a ScrapeResult from the extracted data.
 */
function buildScrapeResult(
  url: string,
  userInfo: Record<string, unknown>,
  posts: Record<string, unknown>[],
  scrapeMethod: ScrapeResult['scrapeMethod'],
  warnings: string[],
  partialData: boolean
): ScrapeResult {
  return {
    account: {
      xhsUrl: url,
      nickname: (userInfo.nickname as string) || '',
      xhsId: (userInfo.xhsId as string) || extractUserIdFromUrl(url),
      avatarUrl: (userInfo.avatarUrl as string) || '',
      bio: (userInfo.bio as string) || '',
      location: (userInfo.location as string) || '',
      followers: (userInfo.followers as number) || 0,
      following: (userInfo.following as number) || 0,
      likedCollected: (userInfo.likedCollected as number) || 0,
      notesCount: (userInfo.notesCount as number) || 0,
    },
    posts: posts.map((p) => ({
      xhsPostId: (p.xhsPostId as string) || '',
      title: (p.title as string) || '',
      coverUrl: (p.coverUrl as string) || '',
      likes: (p.likes as number) || 0,
      comments: (p.comments as number) || 0,
      collects: (p.collects as number) || 0,
      shares: (p.shares as number) || 0,
      postType: (p.postType as string) || 'normal',
      publishDate: (p.publishDate as string) || '',
    })),
    totalFound: posts.length,
    scrapeMethod,
    warnings,
    partialData,
  };
}

/**
 * Scrape a single Xiaohongshu post/note page.
 * Also uses web_search as fallback when page_reader fails.
 */
export async function scrapeXhsPost(url: string): Promise<{
  html: string;
  title: string;
  url: string;
  post: Record<string, unknown>;
  scrapeMethod: 'page_reader' | 'web_search' | 'llm_fallback';
  warnings: string[];
}> {
  const warnings: string[] = [];
  let scrapeMethod: 'page_reader' | 'web_search' | 'llm_fallback' = 'page_reader';

  // ── Strategy 1: Try page_reader ──────────────────────────────────────
  const pageResult = await tryPageReader(url);
  warnings.push(...pageResult.warnings);

  if (pageResult.success) {
    const { html, pageTitle } = pageResult;
    let post: Record<string, unknown> = {};

    // Try extracting from __INITIAL_STATE__
    const initialStateMatch = html.match(
      /window\.__INITIAL_STATE__\s*=\s*(\{.+?\})\s*(?:<\/script>|\s*$)/s
    );
    if (initialStateMatch) {
      try {
        const sanitized = initialStateMatch[1]
          .replace(/:\s*undefined/g, ':null')
          .replace(/undefined/g, 'null');
        const state = JSON.parse(sanitized);

        const noteData =
          state?.note?.noteDetailMap?.note?.note ||
          state?.note ||
          state?.noteDetail ||
          null;
        if (noteData) {
          post = {
            xhsPostId: noteData.noteId || noteData.id || '',
            title: noteData.title || noteData.displayTitle || '',
            content: noteData.desc || noteData.content || noteData.noteDesc || '',
            coverUrl: noteData.cover || noteData.coverUrl || '',
            imageUrls: noteData.imageList || noteData.images || [],
            postType: noteData.type === 'video' ? 'video' : 'normal',
            likes: Number(noteData.likeCount) || Number(noteData.likes) || 0,
            comments:
              Number(noteData.commentCount) || Number(noteData.comments) || 0,
            collects:
              Number(noteData.collectCount) ||
              Number(noteData.collects) ||
              Number(noteData.favorites) ||
              0,
            shares:
              Number(noteData.shareCount) || Number(noteData.shares) || 0,
            tags: noteData.tagList || noteData.tags || [],
            publishDate:
              noteData.time || noteData.publishTime || noteData.createTime || '',
          };
        }
      } catch (e) {
        console.error('Failed to parse post __INITIAL_STATE__:', e);
      }
    }

    // Fallback: extract title from page title
    if (!post.title && pageTitle) {
      const titleClean = pageTitle.replace(/ - 小红书$/, '').trim();
      post.title = titleClean;
    }

    return {
      html,
      title: pageTitle,
      url,
      post,
      scrapeMethod: 'page_reader',
      warnings,
    };
  }

  // ── Strategy 2: web_search for post ──────────────────────────────────
  try {
    const zai = await ZAI.create();

    // Search for the post URL
    const searchResult = await zai.functions.invoke('web_search', {
      query: `小红书 ${url}`,
      num: 5,
    });

    const searchResults = searchResult?.data?.results || [];

    if (searchResults.length > 0) {
      const searchSummary = searchResults
        .map(
          (r: { title?: string; snippet?: string; url?: string }, i: number) =>
            `[${i + 1}] 标题: ${r.title || ''}\n    摘要: ${r.snippet || ''}\n    链接: ${r.url || ''}`
        )
        .join('\n\n');

      // Use LLM to extract post data from search results
      const llmResult = await zai.chat.completions.create({
        model: 'glm-4-flash',
        messages: [
          {
            role: 'system',
            content: `你是一个数据提取助手。根据搜索引擎返回的结果，提取小红书笔记/帖子的信息。

请返回 ONLY 合法的 JSON，格式如下：
{
  "xhsPostId": "笔记ID",
  "title": "笔记标题",
  "content": "笔记内容摘要",
  "likes": 0,
  "comments": 0,
  "collects": 0,
  "shares": 0,
  "tags": ["标签1", "标签2"],
  "postType": "normal",
  "publishDate": ""
}

如果某个字段无法从搜索结果中获取，使用空字符串、0或空数组。`,
          },
          {
            role: 'user',
            content: `请从以下搜索结果中提取小红书笔记信息:\n\n${searchSummary.slice(0, 4000)}`,
          },
        ],
        temperature: 0.1,
      });

      const content = llmResult.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const post = JSON.parse(jsonMatch[0]);
        scrapeMethod = 'web_search';
        warnings.push('小红书网站屏蔽了直接访问，使用了搜索引擎数据');

        return {
          html: '',
          title: (post.title as string) || '',
          url,
          post,
          scrapeMethod,
          warnings,
        };
      }
    }
  } catch (e) {
    console.error('Web search for post failed:', e);
    warnings.push('搜索引擎策略失败');
  }

  // ── Strategy 3: LLM fallback for post ────────────────────────────────
  try {
    const zai = await ZAI.create();
    const llmResult = await zai.chat.completions.create({
      model: 'glm-4-flash',
      messages: [
        {
          role: 'system',
          content: `你是一个小红书数据分析助手。用户提供了一个小红书笔记的URL，但无法直接访问，也无法通过搜索引擎找到相关信息。

请根据URL结构进行基础分析，返回 ONLY 合法的 JSON，格式如下：
{
  "xhsPostId": "从URL提取的笔记ID",
  "title": "",
  "content": "",
  "likes": 0,
  "comments": 0,
  "collects": 0,
  "shares": 0,
  "tags": [],
  "postType": "normal",
  "publishDate": "",
  "suggestions": ["建议1", "建议2"]
}`,
        },
        {
          role: 'user',
          content: `请分析以下小红书笔记URL:\n${url}`,
        },
      ],
      temperature: 0.3,
    });

    const content = llmResult.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const post = JSON.parse(jsonMatch[0]);
      const suggestions = post.suggestions;
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        warnings.push(`手动补充建议: ${suggestions.join('; ')}`);
      }
      // Remove suggestions from post data
      delete post.suggestions;

      scrapeMethod = 'llm_fallback';
      warnings.push('无法获取笔记数据，使用LLM基础分析');

      return {
        html: '',
        title: (post.title as string) || '',
        url,
        post,
        scrapeMethod,
        warnings,
      };
    }
  } catch (e) {
    console.error('LLM fallback for post failed:', e);
    warnings.push('所有采集策略均失败');
  }

  // Ultimate fallback
  return {
    html: '',
    title: '',
    url,
    post: {},
    scrapeMethod: 'llm_fallback',
    warnings: [...warnings, '所有采集策略均失败，返回空数据'],
  };
}
