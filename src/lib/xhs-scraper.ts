import ZAI from 'z-ai-web-dev-sdk';
import type { ScrapeResult } from '@/types';

/**
 * Scrape a Xiaohongshu user profile page.
 * Uses ZAI page_reader to fetch the HTML, then extracts structured data.
 * Falls back to LLM analysis if structured extraction fails.
 */
export async function scrapeXhsProfile(url: string): Promise<ScrapeResult> {
  const zai = await ZAI.create();
  const result = await zai.functions.invoke('page_reader', { url });

  const html: string = result.data?.html || '';
  const pageTitle: string = result.data?.title || '';

  // ── Step 1: Try to extract from embedded JSON state ──────────────
  let userInfo: Record<string, unknown> = {};
  let posts: Record<string, unknown>[] = [];

  // Try __INITIAL_STATE__ pattern
  const initialStateMatch = html.match(
    /window\.__INITIAL_STATE__\s*=\s*(\{.+?\})\s*(?:<\/script>|\s*$)/s
  );
  if (initialStateMatch) {
    try {
      // The state JSON may contain undefined which is not valid JSON – replace with null
      const sanitized = initialStateMatch[1]
        .replace(/:\s*undefined/g, ':null')
        .replace(/undefined/g, 'null');
      const state = JSON.parse(sanitized);

      // Navigate common state paths for user info
      const userState =
        state?.user?.userinfo ||
        state?.user ||
        state?.note?.user ||
        null;
      if (userState) {
        userInfo = {
          nickname: userState.nickname || userState.nickName || '',
          xhsId: userState.userId || userState.xhsId || userState.redId || '',
          avatarUrl: userState.avatar || userInfo.avatar || '',
          bio: userState.desc || userState.description || '',
          location: userState.location || userState.ipLocation || '',
          followers: Number(userState.followers) || Number(userState.fans) || 0,
          following: Number(userState.follows) || Number(userState.following) || 0,
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

      // Try to extract note list
      const notesData =
        state?.user?.notes ||
        state?.notes ||
        state?.note?.notes ||
        [];
      if (Array.isArray(notesData)) {
        posts = notesData.map((note: Record<string, unknown>) => ({
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
        }));
      }
    } catch (e) {
      console.error('Failed to parse __INITIAL_STATE__:', e);
    }
  }

  // ── Step 2: Fallback – extract from title & HTML text ────────────
  if (!userInfo.nickname) {
    const nicknameMatch = pageTitle.match(/^(.+?)的小红书/);
    userInfo.nickname = nicknameMatch ? nicknameMatch[1] : '';
  }

  // Extract follower / like counts from text patterns
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

  // Try to grab bio from meta description
  if (!userInfo.bio) {
    const descMatch = html.match(
      /<meta\s+name="description"\s+content="([^"]+)"/
    );
    if (descMatch) userInfo.bio = descMatch[1];
  }

  // ── Step 3: If still no structured data, use LLM to analyze HTML ─
  if (!userInfo.nickname && html.length > 100) {
    try {
      const llmResult = await zai.chat.completions.create({
        model: 'glm-4-flash',
        messages: [
          {
            role: 'system',
            content:
              'You are a data extraction assistant. Extract structured user profile information from the given HTML of a Xiaohongshu (小红书) profile page. Return ONLY valid JSON with these fields: nickname, xhsId, bio, location, followers (number), following (number), likedCollected (number), notesCount (number). If a field cannot be found, use an empty string or 0.',
          },
          {
            role: 'user',
            content: `Extract user info from this HTML:\n\n${html.slice(0, 8000)}`,
          },
        ],
        temperature: 0.1,
      });

      const content = llmResult.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        userInfo = { ...userInfo, ...parsed };
      }
    } catch (e) {
      console.error('LLM extraction failed:', e);
    }
  }

  return {
    account: {
      xhsUrl: url,
      nickname: (userInfo.nickname as string) || '',
      xhsId: (userInfo.xhsId as string) || '',
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
  };
}

/**
 * Scrape a single Xiaohongshu post/note page.
 * Returns raw HTML plus any extracted data.
 */
export async function scrapeXhsPost(url: string): Promise<{
  html: string;
  title: string;
  url: string;
  post: Record<string, unknown>;
}> {
  const zai = await ZAI.create();
  const result = await zai.functions.invoke('page_reader', { url });

  const html: string = result.data?.html || '';
  const pageTitle: string = result.data?.title || '';
  const pageUrl: string = result.data?.url || url;

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
          shares: Number(noteData.shareCount) || Number(noteData.shares) || 0,
          tags: noteData.tagList || noteData.tags || [],
          publishDate:
            noteData.time || noteData.publishTime || noteData.createTime || '',
        };
      }
    } catch (e) {
      console.error('Failed to parse post __INITIAL_STATE__:', e);
    }
  }

  // Fallback: LLM extraction
  if (!post.title && html.length > 100) {
    try {
      const llmResult = await zai.chat.completions.create({
        model: 'glm-4-flash',
        messages: [
          {
            role: 'system',
            content:
              'You are a data extraction assistant. Extract structured post information from the given HTML of a Xiaohongshu (小红书) note/post page. Return ONLY valid JSON with these fields: title, content, likes (number), comments (number), collects (number), shares (number), tags (array of strings), publishDate (string). If a field cannot be found, use an empty string, 0, or empty array.',
          },
          {
            role: 'user',
            content: `Extract post info from this HTML:\n\n${html.slice(0, 8000)}`,
          },
        ],
        temperature: 0.1,
      });

      const content = llmResult.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        post = { ...post, ...parsed };
      }
    } catch (e) {
      console.error('LLM post extraction failed:', e);
    }
  }

  // If still no title, use page title
  if (!post.title && pageTitle) {
    const titleClean = pageTitle.replace(/ - 小红书$/, '').trim();
    post.title = titleClean;
  }

  return {
    html,
    title: pageTitle,
    url: pageUrl,
    post,
  };
}
