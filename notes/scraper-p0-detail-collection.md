# 采集器 P0 — 笔记详情完整采集

## 日期: 2026-05-07

## 问题描述

列表页 API (`/user_posted`) 只返回封面图和标题，不包含正文、图片组、视频 URL。用户看到的笔记详情是空的。

## 解决方案

利用已有的 `scrapeNoteWithBrowser` 能力（通过浏览器拦截 `/api/sns/web/v1/feed`），在列表采集后批量调用笔记详情接口。

## 核心变更

### 1. Schema 迁移
- `XhsPost` 新增 `videoUrl` (String, default "") — 视频播放地址
- `XhsPost` 新增 `detailScrapedAt` (DateTime?) — 详情页已采集时间

### 2. 浏览器策略增强 (`browser-strategy.ts`)
- `parseNoteFromApi` 增强：提取视频 URL（多级 fallback: stream.url → h264 → h265）、发布时间（Unix 时间戳）、标签列表、完整图片组
- `PostData` 接口增加 `videoUrl` 和 `imageUrls` 字段
- `NoteScrapeResult` 接口增加 `videoUrl` 字段

### 3. 采集路由集成 (`scrape/route.ts`)
- 列表采集后，筛选缺少正文的笔记（content < 10 字符）
- 并发限制 = 3，批次间隔 2-3s，`Promise.allSettled` 容忍部分失败
- 合并详情到每条 post（content, imageUrls, videoUrl, tags, publishDate）
- 保存时写入 `videoUrl` 和 `detailScrapedAt` 字段

## 风险点

1. **xsec_token 过期** — 列表采集后立即采集详情，token 仍有效
2. **视频 URL 时效性** — 视频 URL 通常有防盗链时效，建议使用时实时获取
3. **批量请求触发频率限制** — 并发限制=3 + 批次间隔已缓解

## 关键发现

列表 API 返回的笔记**已包含部分互动数据**（likes, comments, collects, shares），但**缺少正文、图片组、视频 URL**。详情 API (`/feed`) 必须传 `xsec_token`，我们的浏览器方案天然携带有效 token。
