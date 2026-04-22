import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/tracked-accounts - List all tracked accounts
// Optional query: ?platform=wechat|xiaohongshu&own=true|false
// Returns sorted by lastSyncAt desc (nulls last)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const ownParam = searchParams.get('own');

    // Build where clause
    const where: Record<string, unknown> = {};
    if (platform && ['wechat', 'xiaohongshu'].includes(platform)) {
      where.platform = platform;
    }
    if (ownParam !== null) {
      where.isOwn = ownParam === 'true';
    }

    const accounts = await db.trackedAccount.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        _count: {
          select: { syncTasks: true },
        },
      },
      orderBy: [
        { lastSyncAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Failed to fetch tracked accounts:', error);
    return NextResponse.json({ error: '获取追踪账号列表失败' }, { status: 500 });
  }
}

// POST /api/tracked-accounts - Create new tracked account
// Body: { platform, homeUrl, nickname?, avatarUrl?, bio?, isOwn?, collectMethod?, generateDemo? }
// If collectMethod is 'link', immediately triggers a profile scrape via the scraper service (port 3003)
// If generateDemo is true, skip scraper and generate realistic demo data directly
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, homeUrl, nickname, collectMethod, cookie, isOwn, avatarUrl, bio, generateDemo } = body;

    // Validate platform
    if (!platform || !['wechat', 'xiaohongshu'].includes(platform)) {
      return NextResponse.json(
        { error: '平台类型无效，仅支持 wechat（朋友圈）或 xiaohongshu（小红书）' },
        { status: 400 },
      );
    }

    // When generateDemo is true, allow empty homeUrl
    const trimmedUrl = (homeUrl || '').trim();
    if (!generateDemo && (!trimmedUrl || typeof homeUrl !== 'string' || trimmedUrl.length === 0)) {
      return NextResponse.json(
        { error: '主页链接不能为空' },
        { status: 400 },
      );
    }

    // Validate collectMethod
    const validMethods = ['link', 'cookie', 'manual'];
    const method = collectMethod || 'link';
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: '采集方式无效，仅支持 link / cookie / manual' },
        { status: 400 },
      );
    }

    // Generate demo data if requested
    if (generateDemo) {
      const demoData = generateDemoProfile(trimmedUrl || 'https://www.xiaohongshu.com/user/profile/demo');
      const account = await db.trackedAccount.create({
        data: {
          platform: platform.trim(),
          homeUrl: trimmedUrl || demoData.homeUrl,
          nickname: demoData.nickname,
          avatarUrl: demoData.avatarUrl,
          bio: demoData.bio,
          followers: demoData.followers,
          following: demoData.following,
          postsCount: demoData.postsCount,
          collectMethod: method,
          cookie: '',
          isOwn: isOwn !== undefined ? !!isOwn : true,
          status: 'success',
          lastSyncAt: new Date(),
        },
      });

      // Generate demo notes for this account
      const notesCount = await createDemoNotes(account.id, platform.trim());
      await db.trackedAccount.update({
        where: { id: account.id },
        data: { totalCollected: notesCount },
      });

      return NextResponse.json(account, { status: 201 });
    }

    const account = await db.trackedAccount.create({
      data: {
        platform: platform.trim(),
        homeUrl: trimmedUrl,
        nickname: (nickname || '').trim(),
        avatarUrl: (avatarUrl || '').trim(),
        bio: (bio || '').trim(),
        collectMethod: method,
        cookie: (cookie || '').trim(),
        isOwn: isOwn !== undefined ? !!isOwn : true,
        status: (method === 'link' || method === 'cookie') ? 'syncing' : 'idle',
      },
    });

    // If collectMethod is 'link', trigger a profile scrape in the background
    if (method === 'link' || method === 'cookie') {
      // Fire-and-forget: don't await the scraper call
      triggerProfileScrape(account.id, platform.trim(), trimmedUrl, cookie || undefined).catch((err) => {
        console.error(`[Background] Profile scrape failed for account ${account.id}:`, err);
      });
    }

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Failed to create tracked account:', error);
    return NextResponse.json({ error: '创建追踪账号失败' }, { status: 500 });
  }
}

/**
 * Trigger a profile scrape on the scraper mini-service (port 3003)
 * Updates account info (nickname, avatar, bio, followers, etc.) from the scrape result
 */
async function triggerProfileScrape(
  accountId: string,
  platform: string,
  homeUrl: string,
  cookie?: string,
) {
  try {
    const scrapeUrl = platform === 'xiaohongshu'
      ? '/api/scrape/xhs/profile?XTransformPort=3003'
      : '/api/scrape/wechat/profile?XTransformPort=3003';

    // Use AbortController with timeout for service availability detection
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response: Response;
    try {
      response = await fetch(scrapeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeUrl, cookie: cookie || undefined }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      const isTimeout = fetchErr instanceof DOMException && fetchErr.name === 'AbortError';
      throw new Error(
        isTimeout
          ? '采集服务响应超时，请稍后重试'
          : '采集服务未启动，请稍后重试（Scraper service unreachable）'
      );
    }
    clearTimeout(timeout);

    if (!response.ok) {
      // 502/503/504 typically means service is down or gateway issue
      if ([502, 503, 504].includes(response.status)) {
        throw new Error(`采集服务暂时不可用（HTTP ${response.status}），请稍后重试`);
      }
      const errorText = await response.text();
      throw new Error(`Scraper returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Update the account with scraped profile info
    if (result.profile) {
      const { nickname, avatarUrl, bio, followers, following, postsCount } = result.profile;
      await db.trackedAccount.update({
        where: { id: accountId },
        data: {
          nickname: nickname || '',
          avatarUrl: avatarUrl || '',
          bio: bio || '',
          followers: followers || 0,
          following: following || 0,
          postsCount: postsCount || 0,
          status: 'success',
          lastSyncAt: new Date(),
        },
      });
    } else {
      await db.trackedAccount.update({
        where: { id: accountId },
        data: { status: 'error', lastError: '未能获取到账号信息' },
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await db.trackedAccount.update({
      where: { id: accountId },
      data: { status: 'error', lastError: errorMsg },
    });
    throw error;
  }
}

// ─── Demo Data Generation ──────────────────────────────────────────────────

const DEMO_PROFILES = [
  { nickname: '生活美学家小王', bio: '分享日常美好 | 好物推荐 | 生活方式博主 🌿', avatarSeed: 'lifestyle-wang' },
  { nickname: '穿搭日记Anna', bio: 'OOTD日常穿搭 | 平价好物 | 让每个人都能穿出自信 ✨', avatarSeed: 'fashion-anna' },
  { nickname: '美食探店达人', bio: '吃遍全城美食 🍜 探店记录 | 菜谱分享 | 美食vlog', avatarSeed: 'food-explorer' },
  { nickname: '职场成长记', bio: '打工人的成长之路 💼 职场干货 | 效率工具 | 自我提升', avatarSeed: 'career-growth' },
  { nickname: '旅行摄影师小陈', bio: '用镜头记录世界 📷 旅行攻略 | 摄影技巧 | 小众目的地', avatarSeed: 'travel-chen' },
  { nickname: '护肤研究所', bio: '成分党 | 护肤测评 | 科学变美 🧪', avatarSeed: 'skincare-lab' },
  { nickname: '健身少女Lily', bio: '自律即自由 💪 健身打卡 | 健康饮食 | 运动穿搭', avatarSeed: 'fitness-lily' },
  { nickname: '家居改造王', bio: '出租屋改造 | 软装搭配 | 百元好物 🏠', avatarSeed: 'home-design' },
];

const DEMO_NOTES = [
  {
    topic: '这5款平价护肤品真的绝了！学生党必看',
    content: '今天给大家安利5款我一直在回购的平价护肤品，每款都不超过50元！真的是学生党的福音～\n\n1. 珂润保湿面霜 - 干皮救星，上脸很舒服\n2. 珊瑚净透洗面奶 - 泡沫细腻，洗完不紧绷\n3. 适乐肤PM乳 - 维稳神器，换季必备\n4. 薏仁水 - 湿敷超好用，白菜价大碗\n5. 丝塔芙洁面 - 敏感肌友好，温和不刺激\n\n你们还有什么平价好物推荐吗？评论区告诉我呀～',
    contentType: 'seeding', tags: '#平价护肤 #学生党必看 #护肤推荐 #好物分享', likesRange: [1200, 5800], commentsRange: [80, 350], sharesRange: [200, 900], viewsRange: [15000, 80000],
  },
  {
    topic: '办公室好物推荐｜打工人都说好的提升幸福感小物件',
    content: '在办公室坐了一整天，这些小物件真的提升了我的幸福感！\n\n📦 桌面收纳架 - 杂物终于有地方放了\n☕ 保温杯 - 随时喝到热水太重要了\n🎧 降噪耳机 - 开会、专注的神器\n🪴 桌面小绿植 - 看着心情就好\n⌨️ 机械键盘 - 打字手感真的不一样\n💡 护眼台灯 - 加班也要保护眼睛\n\n打工人们，你们桌上都有什么好物？',
    contentType: 'recommend', tags: '#办公室好物 #打工人日常 #提升幸福感 #好物推荐', likesRange: [800, 4200], commentsRange: [50, 280], sharesRange: [150, 700], viewsRange: [10000, 60000],
  },
  {
    topic: '周末探店 | 藏在巷子里的宝藏咖啡店☕',
    content: '周末和闺蜜发现了一家超有氛围感的咖啡店！\n\n📍 位置：就在老城区的一条小巷子里，不太好找但绝对值得\n🌿 环境：复古工业风，每个角落都很出片\n☕ 推荐：桂花拿铁和提拉米苏都超好吃！\n💰 人均：40-50元\n\n老板人超nice，还会给你讲咖啡豆的故事。周末去坐坐真的很放松～\n\n#咖啡探店 #周末去哪儿 #小众咖啡店 #探店分享',
    contentType: 'daily', tags: '#咖啡探店 #周末去哪儿 #小众咖啡店 #探店分享', likesRange: [2000, 8900], commentsRange: [120, 480], sharesRange: [300, 1200], viewsRange: [25000, 120000],
  },
  {
    topic: '月薪5000的打工人如何理财？我的攒钱心得分享',
    content: '作为一个月薪5000的打工人，我用了1年时间攒下了3万块！\n\n📊 我的攒钱方法：\n1. 50-30-20法则：必需品50%、想要30%、储蓄20%\n2. 每月发工资第一件事就是转储蓄\n3. 午餐自己带饭，每月省800+\n4. 取消不必要的会员订阅\n5. 记账！一定要记账！\n\n🌟 小tips：把攒钱目标写下来贴在墙上，每次想花钱就看看\n\n理财不是富人的专利，普通人更需要学会管理自己的钱！',
    contentType: 'drygoods', tags: '#理财分享 #攒钱 #打工人理财 #个人成长', likesRange: [3500, 12000], commentsRange: [200, 650], sharesRange: [500, 2000], viewsRange: [40000, 180000],
  },
  {
    topic: '我的极简衣柜｜20件衣服穿出一个月不重样',
    content: '整理了衣柜，发现自己其实只需要这些衣服就够了！\n\n👔 基础款（8件）：\n- 白T恤 x2、黑T恤 x1\n- 衬衫（白+蓝）\n- 西装外套\n- 牛仔裤 x2\n- 小黑裙\n\n🎨 点缀款（7件）：\n- 条纹上衣、针织开衫、卫衣\n- 阔腿裤、半身裙\n- 风衣、羽绒服\n\n👔 配件（5件）：\n- 丝巾、腰带、项链、包包、帽子\n\n极简不等于无趣，搭配好了每天都不一样！\n\n#极简穿搭 #胶囊衣柜 #穿搭分享 #断舍离',
    contentType: 'collection', tags: '#极简穿搭 #胶囊衣柜 #穿搭分享 #断舍离', likesRange: [1500, 6800], commentsRange: [90, 400], sharesRange: [250, 1000], viewsRange: [20000, 90000],
  },
  {
    topic: '新手化妆教程 | 5分钟出门妆容分享💄',
    content: '上班族必看！5分钟就能搞定的日常妆容～\n\nStep 1️⃣ 防晒 + 气垫（1分钟）\nStep 2️⃣ 眉毛用眉笔简单画一下（1分钟）\nStep 3️⃣ 大地色眼影扫一下眼窝（1分钟）\nStep 4️⃣ 涂个润唇膏或淡色口红（30秒）\nStep 5️⃣ 腮红轻轻扫在苹果肌上（30秒）\n\n✨ 重点：皮肤底子好比什么都重要，妆前一定要做好保湿！\n\n用的产品都是平价好用的，具体品牌看图～\n\n#化妆教程 #新手化妆 #日常妆容 #上班族妆容',
    contentType: 'tutorial', tags: '#化妆教程 #新手化妆 #日常妆容 #上班族妆容', likesRange: [2800, 9500], commentsRange: [150, 520], sharesRange: [400, 1500], viewsRange: [30000, 140000],
  },
  {
    topic: '一人食晚餐 | 15分钟搞定营养均衡的一餐',
    content: '下班回家不想做饭又不想点外卖？试试这个！\n\n🍳 今日菜单：番茄鸡蛋面 + 凉拌黄瓜\n\n番茄鸡蛋面：\n1. 番茄切块炒出汁\n2. 加水煮开下挂面\n3. 打个鸡蛋花\n4. 加盐、生抽、一点点糖\n\n凉拌黄瓜：\n1. 黄瓜拍碎\n2. 蒜末 + 生抽 + 醋 + 香油 + 辣椒油\n\n🍲 一共不到15分钟，有菜有蛋有主食，营养够够的！\n\n#一人食 #快手晚餐 #简单晚餐 #晚餐食谱',
    contentType: 'daily', tags: '#一人食 #快手晚餐 #简单晚餐 #晚餐食谱', likesRange: [900, 4800], commentsRange: [60, 300], sharesRange: [180, 750], viewsRange: [12000, 65000],
  },
  {
    topic: '租房改造｜花500块让出租屋变成温馨小窝🏠',
    content: '刚搬进来的时候真的很破旧，花了一个周末改造了一下！\n\n✅ 改造清单：\n- 墙纸（60元）- 贴了床头背景墙\n- LED灯带（25元）- 氛围感直接拉满\n- 窗帘（80元）- 遮光又好看\n- 地毯（120元）- 房间立马温馨了\n- 置物架（45元）- 收纳必备\n- 小桌布（30元）- 桌子焕然一新\n- 绿植（40元）- 角落的生命力\n- 其他小物件（100元）\n\n💡 改造tips：颜色统一用米白+原木色，看着就很舒服！\n\n#出租屋改造 #租房改造 #小户型布置 #居家好物',
    contentType: 'seeding', tags: '#出租屋改造 #租房改造 #小户型布置 #居家好物', likesRange: [5000, 15000], commentsRange: [300, 800], sharesRange: [800, 3000], viewsRange: [60000, 250000],
  },
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDemoProfile(homeUrl: string) {
  const profile = DEMO_PROFILES[randInt(0, DEMO_PROFILES.length - 1)];

  // Try to extract a username-like string from the URL
  let urlUsername = '';
  try {
    const urlParts = homeUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && lastPart.length > 0 && lastPart !== 'demo') {
      urlUsername = lastPart.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '').slice(0, 20);
    }
  } catch {
    // ignore
  }

  const suffix = urlUsername ? ` (${urlUsername})` : '';
  return {
    nickname: profile.nickname + suffix,
    bio: profile.bio,
    avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.avatarSeed}`,
    followers: randInt(5000, 50000),
    following: randInt(100, 1000),
    postsCount: randInt(50, 200),
    homeUrl: homeUrl,
  };
}

async function createDemoNotes(accountId: string, platform: string): Promise<number> {
  const count = randInt(6, 8);
  const selectedNotes = [...DEMO_NOTES].sort(() => Math.random() - 0.5).slice(0, count);

  // Find or create a scraped content plan
  const plan = await db.contentPlan.upsert({
    where: { id: `scraped-${platform}` },
    create: {
      id: `scraped-${platform}`,
      month: new Date().toISOString().slice(0, 7),
      theme: `scraped-${platform}`,
      status: 'completed',
    },
    update: {},
  });

  // Generate random dates within the last 60 days
  const now = Date.now();
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

  let created = 0;
  for (const note of selectedNotes) {
    const scheduledDate = new Date(randInt(sixtyDaysAgo, now)).toISOString().slice(0, 10);
    try {
      await db.contentPost.create({
        data: {
          planId: plan.id,
          platform,
          contentType: note.contentType,
          topic: note.topic,
          content: note.content + '\n\n' + note.tags,
          scheduledDate,
          status: 'published',
          generationType: 'scraped',
          likes: randInt(note.likesRange[0], note.likesRange[1]),
          comments: randInt(note.commentsRange[0], note.commentsRange[1]),
          shares: randInt(note.sharesRange[0], note.sharesRange[1]),
          favorites: randInt(note.likesRange[0] * 2, note.likesRange[1] * 3),
          views: randInt(note.viewsRange[0], note.viewsRange[1]),
        },
      });
      created++;
    } catch {
      // Skip duplicates
    }
  }

  return created;
}
