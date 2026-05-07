# 采集器迭代计划 — 笔记详情页完整内容采集

## 现状分析

### 当前采集流程
```
用户添加账号 → Cookie/搜索采集 → 访问个人主页 → 拦截 /api/sns/web/v1/user_posted → 获取笔记列表
```

### 当前采集到的数据（列表页 API）
| 字段 | 来源 | 状态 |
|------|------|------|
| note_id | `/user_posted` API | ✅ 有 |
| display_title | `/user_posted` API | ✅ 有 |
| cover.url | `/user_posted` API | ✅ 有（仅封面图） |
| interact_info (likes/comments/collects/shares) | `/user_posted` API | ✅ 有 |
| tag_list | `/user_posted` API | ✅ 有 |
| type (video/normal) | `/user_posted` API | ✅ 有 |
| 正文内容 (desc) | `/user_posted` API | ❌ 列表页不返回 |
| 图片组 (image_list) | `/user_posted` API | ❌ 列表页只返回封面 |
| 视频 URL | `/user_posted` API | ❌ 列表页不返回 |
| 发布时间 | `/user_posted` API | ⚠️ 部分字段可能有，但不稳定 |

### 已有但未使用的能力
- **`/api/scrape/note` 端点已存在**（`browser-strategy.ts:405` `scrapeNoteWithBrowser`）
- 已实现拦截 `/api/sns/web/v1/feed` 获取笔记详情
- `parseNoteFromApi` 已能解析 `image_list`、`video` 等字段
- **但主采集流程（`scrape/route.ts`）从未调用这个端点**

### 数据库已具备的字段
- `imageUrls` (JSON string) — 已存在，当前存空数组
- `content` — 已存在，当前存空字符串
- `postType` — 已存在，标记 `normal` / `video`
- **缺少 `videoUrl` 字段** — 需要 schema 迁移

---

## 目标

采集每条笔记的**完整详情页数据**：
1. **正文内容** — 完整的笔记文字描述
2. **图片组** — 所有图片的 URL（多图笔记通常 3-9 张）
3. **视频 URL** — 视频笔记的播放地址
4. **发布时间** — 精确到分钟

---

## GitHub 开源项目调研

### 参考项目：MediaCrawler（48.9k stars）
- **核心端点**: `POST /api/sns/web/v1/feed`
- **关键参数**: `source_note_id`, `image_formats`, `extra.need_body_topic=1`, `xsec_source`, `xsec_token`
- **返回数据**: `items[0].note_card` 包含完整笔记数据
  - `note_card.desc` — 正文
  - `note_card.image_list[]` — 图片列表（含 `url_default`, `url_pre`, `info_list`）
  - `note_card.video` — 视频信息（`media.stream.url`, `media.stream.h264`）
  - `note_card.time` — 发布时间戳
  - `note_card.tag_list` — 标签

### 我们的优势
我们的 scraper v2 **已经实现了** `scrapeNoteWithBrowser`，通过 Playwright 浏览器自动化拦截 `/api/sns/web/v1/feed` 响应，**无需手动处理签名**（`x-s`, `x-t`, `x-s-common`）。

### 关键发现
1. 列表页 API (`/user_posted`) 返回的每条笔记**包含 `xsec_token`**
2. 详情页 API (`/feed`) **必须传 `xsec_token`**，否则返回 401
3. `xsec_token` 有**时效性**（通常几小时内有效）
4. 我们的浏览器拦截方案天然获取了正确的 token（浏览器自带 cookie + 签名）

---

## 迭代方案

### Phase 1: 采集流程增强（核心）

#### 1.1 修改 `scrape/route.ts` — 批量采集笔记详情

**当前流程**:
```
获取笔记列表 (N条) → 保存到数据库 → 完成
```

**新流程**:
```
获取笔记列表 (N条) → 提取 noteId 列表 → 批量调用 /api/scrape/note → 合并详情到每条笔记 → 保存到数据库
```

**具体改动**:

```typescript
// scrape/route.ts 中，在保存 posts 之前：

// Step 2.5: 批量获取笔记详情（限制并发数，避免触发反爬）
const CONCURRENCY_LIMIT = 3;
const detailResults = new Map<string, NoteDetail>();

for (let i = 0; i < posts.length; i += CONCURRENCY_LIMIT) {
  const batch = posts.slice(i, i + CONCURRENCY_LIMIT);
  const results = await Promise.allSettled(
    batch.map(async (post) => {
      if (!post.xhsPostId) return null;
      const res = await fetch(`${SCRAPER_SERVICE_URL}/api/scrape/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: post.xhsPostId }),
        signal: AbortSignal.timeout(30000),
      });
      const json = await res.json();
      if (json.success && json.data?.note) {
        return { postId: post.xhsPostId, detail: json.data.note };
      }
      return null;
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      detailResults.set(result.value.postId, result.value.detail);
    }
  }

  // 批次间延迟，避免请求过快
  if (i + CONCURRENCY_LIMIT < posts.length) {
    await sleep(2000 + Math.random() * 1000);
  }
}

// 合并详情到每条笔记
for (const post of posts) {
  const detail = detailResults.get(post.xhsPostId);
  if (detail) {
    post.content = detail.content || post.content;
    post.imageUrls = detail.imageUrls?.length ? detail.imageUrls : post.imageUrls;
    // videoUrl 需要新字段
    post.publishDate = detail.publishDate || post.publishDate;
  }
}
```

#### 1.2 完善 `browser-strategy.ts` — 笔记详情解析

当前 `parseNoteFromApi` 缺少以下字段提取：
- **视频 URL**: `noteItem.note_card.video?.media?.stream?.url` 或 `h264` / `h265`
- **发布时间**: `noteItem.note_card.time`（Unix 时间戳）
- **标签**: `noteItem.note_card.tag_list`
- **互动数据**: 已有但需确认字段名

```typescript
// parseNoteFromApi 增强：
const noteCard = noteItem.note_card || noteItem;

// 视频 URL 提取（多级 fallback）
const video = noteCard.video || {};
const videoUrl = video.media?.stream?.url
  || video.media?.stream?.h264?.[0]?.master_url
  || video.media?.stream?.h265?.[0]?.master_url
  || video.url || '';

// 发布时间
const publishDate = noteCard.time
  ? new Date(Number(noteCard.time) * 1000).toISOString()
  : '';

// 图片列表（增强版）
const imageUrls = (noteCard.image_list || [])
  .map((img: any) => img.url_default || img.url_info?.url || info_list?.[0]?.url || '')
  .filter(Boolean);

// 标签
const tags = (noteCard.tag_list || [])
  .map((t: any) => typeof t === 'string' ? t : t.name || t.tag_type || '')
  .filter(Boolean);
```

#### 1.3 新增 `videoUrl` 字段到数据库

```prisma
// prisma/schema.prisma
model XhsPost {
  // ... existing fields ...
  videoUrl      String   @default("")  // 视频笔记播放地址
}
```

迁移: `bun run db:push`

#### 1.4 更新 `PostData` 接口和保存逻辑

```typescript
// scrape/route.ts 中 postFields 增加：
videoUrl: (postData.videoUrl as string) || '',

// browser-strategy.ts 中 PostData 接口增加：
videoUrl: string;
```

### Phase 2: 智能采集策略（优化）

#### 2.1 选择性详情采集

不是所有笔记都需要立即采集详情：
- **首次采集**: 只获取列表（快速），然后异步排队采集详情
- **用户点击查看**: 实时采集该笔记详情
- **AI 分析触发时**: 确保详情已采集

```typescript
// 新增 API: GET /api/accounts/[id]/notes/[noteId]/scrape
// 当用户在日历/列表中点击某条笔记时，触发单条详情采集
```

#### 2.2 采集进度追踪

```typescript
// XhsPost 模型增加：
detailScrapedAt  DateTime?  // 详情页已采集的时间戳

// 采集流程：
// 1. 列表采集: detailScrapedAt = null
// 2. 详情采集后: detailScrapedAt = now()
// 3. 定时刷新: detailScrapedAt > 7天前 → 重新采集
```

### Phase 3: 前端展示增强

#### 3.1 笔记详情抽屉显示图片组

当前 `note-detail-drawer.tsx` 只显示封面图。需要：
- 图片组轮播（如果有 `imageUrls`）
- 视频播放器（如果 `postType === 'video'` 且有 `videoUrl`）
- 正文内容完整展示

#### 3.2 采集状态指示

笔记卡片上显示采集状态：
- `detailScrapedAt` 为 null → "详情待采集" badge
- `detailScrapedAt` 有值 → 显示最后更新时间

---

## 实施优先级

| 优先级 | 任务 | 预估工时 | 依赖 |
|--------|------|----------|------|
| P0 | 1.3 Schema 迁移 (videoUrl) | 5 min | 无 |
| P0 | 1.2 完善笔记详情解析 | 30 min | 无 |
| P0 | 1.1 批量采集详情集成到 scrape/route.ts | 45 min | P0.1, P0.2 |
| P0 | 1.4 更新保存逻辑 | 10 min | P0.1 |
| P1 | 2.1 单条笔记详情 API | 30 min | P0 |
| P1 | 2.2 采集进度字段 | 15 min | P0 |
| P2 | 3.1 前端图片组/视频展示 | 60 min | P0 |
| P2 | 3.2 采集状态指示 | 20 min | P1.2 |

---

## 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| XHS 反爬升级，浏览器拦截失效 | 无法获取详情 | 备选方案：使用 MediaCrawler 的签名生成逻辑 |
| 批量请求触发频率限制 | 部分笔记详情获取失败 | 并发限制=3，批次间隔 2-3s，`Promise.allSettled` 容忍部分失败 |
| `xsec_token` 过期 | 详情 API 返回 401 | 浏览器方案自带有效 token；列表采集后立即采集详情 |
| 视频 URL 有防盗链/时效 | 保存的 URL 很快失效 | 视频 URL 通常有时效性，建议使用时实时获取或定期刷新 |
| 采集时间过长影响用户体验 | 用户等待超时 | 首次返回列表结果（快速），详情异步补充 |

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `prisma/schema.prisma` | 修改 | XhsPost 增加 `videoUrl`, `detailScrapedAt` |
| `src/app/api/accounts/[id]/scrape/route.ts` | 修改 | 增加批量采集详情逻辑 |
| `mini-services/xhs-scraper/strategies/browser-strategy.ts` | 修改 | 完善 `parseNoteFromApi`，增加视频 URL、发布时间提取 |
| `mini-services/xhs-scraper/index.ts` | 不变 | `/api/scrape/note` 端点已存在 |
| `src/components/account/note-detail-drawer.tsx` | 修改 (P2) | 显示图片组轮播、视频播放器、正文 |
| `src/types/index.ts` | 修改 | XhsPost 类型增加 videoUrl, detailScrapedAt |

---

## 总结

**核心思路**: 利用已有的 `scrapeNoteWithBrowser` 能力，在列表采集后批量调用笔记详情接口，补充正文、图片组、视频 URL 和发布时间。不需要引入新的外部依赖，也不需要重写采集逻辑。

**关键突破点**:
1. 列表 API 返回的笔记**缺少正文、图片组、视频 URL**
2. 详情 API (`/feed`) 返回完整数据，但需要 `xsec_token`
3. 我们的浏览器方案**天然携带有效 token**，绕过了签名问题
4. 已有 `scrapeNoteWithBrowser` 实现，只需集成到主流程
