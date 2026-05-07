# PRD-001: 采集器迭代 — 完整数据采集（图片/视频本地化 + 时间兜底）

> **优先级**: P0  
> **日期**: 2026-05-07  
> **状态**: ✅ 已确认，可开发  

---

## 一、问题描述

当前采集器存在以下缺陷：

1. **发布时间缺失/不精确**：部分笔记没有采集到准确的发布时间戳，导致笔记日历无法正确关联
2. **图片仅存URL**：只保存了图片URL，没有下载到本地，URL过期后图片不可见
3. **视频仅存URL**：只保存了视频URL，防盗链+时效性导致很快失效，无法回看

## 二、目标

| 指标 | 当前 | 目标 |
|------|------|------|
| 发布时间采集率 | ~70% | 100%（采集不到时用户可指定） |
| 图片存储 | 仅URL | URL + 本地下载 |
| 视频存储 | 仅URL | URL + 本地下载 |
| 日历关联准确率 | 不准确 | 100% 精确到具体日期 |

## 三、功能设计

### 3.1 发布时间采集 + 用户兜底

**采集时三级fallback**：
```
1. noteCard.time (Unix timestamp) → 直接转换
2. noteCard.publish_time (字符串) → 解析 "2024-05-07" 格式
3. 当前时间 - noteCard.display_time (如 "3天前") → 估算时间
```

**用户兜底**：
- 如果以上三级都获取不到时间，`publishTime` 设为 `null`
- 前端日历中显示为"未分配日期"的笔记
- 用户可在笔记卡片上手动指定日期（inline date picker）
- 指定后更新 `publishTime` 字段

**输出字段**：`publishTime` (DateTime | null)

### 3.2 图片下载本地化

**采集流程**：
```
1. 从API获取图片URL列表（优先最高分辨率）
2. 对每个URL，使用 fetch/download 下载到本地
3. 保存到 /public/upload/images/{noteId}/{index}.jpg
4. 存储本地路径到数据库: imagePaths (String[])
5. 同时保留原始URL: imageUrls (String[])
```

**文件命名规范**：
```
/public/upload/images/
  └── {xhsPostId}/
      ├── 0.jpg     (封面/第一张)
      ├── 1.jpg
      ├── 2.jpg
      └── ...
```

**输出字段**：
| 字段 | 类型 | 说明 |
|------|------|------|
| `imageUrls` | String[] | 原始URL（备用） |
| `imagePaths` | String[] | 本地路径（优先使用） |

### 3.3 视频下载本地化

**采集流程**：
```
1. 从API获取视频URL (stream.url / h264 / h265 fallback)
2. 使用 fetch/download 下载视频文件
3. 保存到 /public/upload/videos/{noteId}.mp4
4. 存储本地路径到数据库: videoPath (String)
5. 同时保留原始URL: videoUrl (String)
```

**文件命名规范**：
```
/public/upload/videos/
  └── {xhsPostId}.mp4
```

**输出字段**：
| 字段 | 类型 | 说明 |
|------|------|------|
| `videoUrl` | String | 原始URL（防盗链可能失效） |
| `videoPath` | String | 本地路径（优先使用） |
| `videoThumbnail` | String | 视频封面图路径 |

### 3.4 Schema 新增字段

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `imagePaths` | String | "[]" | 本地图片路径数组(JSON字符串) |
| `videoPath` | String | "" | 本地视频路径 |
| `videoThumbnail` | String | "" | 视频封面图路径 |

### 3.5 下载策略

- **超时设置**：单个文件下载超时 30s
- **重试**：失败重试 2 次，间隔 1s
- **并发**：图片组并发下载，最多同时 3 个
- **错误处理**：下载失败不阻塞其他文件，记录错误到日志
- **防盗链**：下载时携带 XHS Cookie 和 Referer 头

## 四、影响范围

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `mini-services/xhs-scraper/strategies/browser-strategy.ts` | 修改 | 新增 downloadMedia() 方法，增强 parseNoteFromApi |
| `mini-services/xhs-scraper/strategies/types.ts` | 修改 | NoteScrapeResult/PostData 新增 imagePaths/videoPath |
| `prisma/schema.prisma` | 修改 | XhsPost 新增 imagePaths/videoPath/videoThumbnail |
| `src/types/index.ts` | 修改 | XhsPostInfo 类型更新 |
| `src/app/api/accounts/[id]/scrape/route.ts` | 修改 | 批量详情采集适配新字段 |
| `src/components/account/note-card.tsx` | 修改 | 未分配日期笔记支持手动指定 |

## 五、验收标准

- [ ] 采集10条笔记，100%包含发布时间（采集不到时用户可手动指定）
- [ ] 图片下载到本地 `/public/upload/images/{noteId}/` 目录
- [ ] 视频下载到本地 `/public/upload/videos/{noteId}.mp4`
- [ ] 前端详情优先显示本地文件，URL作为备用
- [ ] 笔记日历按 publishTime 正确分布
- [ ] 日历中"未分配日期"的笔记可手动指定日期
- [ ] TypeScript 编译通过，0 errors

## 六、风险

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 视频文件大，下载时间长 | 中 | 低 | 单条视频限制50MB，超时30s |
| XHS防盗链拦截下载 | 中 | 中 | 携带Cookie+Referer重试 |
| 磁盘空间占用增长 | 中 | 低 | 定期清理机制（未来迭代） |
| 小红书API字段结构变化 | 中 | 高 | 记录原始API结构日志 |
