# PRD-005: 新建笔记流程重构 + 视频笔记支持

> **优先级**: P1  
> **日期**: 2026-05-07  
> **状态**: 待确认  

---

## 一、问题描述

1. 当前新建笔记流程断裂：创建后无法落地，没有后续操作（无法预览、排期、发布）
2. 当前不支持视频笔记创建，而短视频是当前主流内容形式
3. 笔记创建后的使用路径不清晰（创建→?→发布）

## 二、目标

| 指标 | 当前 | 目标 |
|------|------|------|
| 笔记创建流程 | 创建后无后续 | 创建→草稿→排期→发布 完整链路 |
| 视频笔记支持 | 不支持 | 支持上传/粘贴视频URL发布视频笔记 |
| 草稿管理 | 无 | 可保存/编辑/删除草稿 |
| 发布排期 | 有ScheduledNote但流程不清晰 | 可视化排期 + 状态追踪 |

## 三、功能设计

### 3.1 完整笔记生命周期

```
创建笔记
  │
  ├──→ 保存草稿 → 草稿箱 → 编辑 → 确认发布
  │                          │
  │                          ├──→ 立即发布（调用发布API）
  │                          │
  │                          └──→ 定时发布（加入排期队列）
  │
  └──→ AI辅助创作 → 生成方案 → 确认后保存草稿 → 同上
```

### 3.2 新建笔记表单

**字段**：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 标题 | text | 是 | 最多30字 |
| 内容类型 | radio | 是 | 图文 / 视频 |
| 图片/视频 | file upload / URL | 是 | 图文：最多9张；视频：1个 |
| 正文 | textarea | 是 | 最多1000字 |
| 标签 | tag input | 否 | 最多10个 |
| 封面图 | auto/select | 图文必填 | 图片笔记自动选第一张 |
| 发布方式 | radio | 是 | 立即发布 / 定时发布 |
| 发布时间 | datetime | 定时必填 | 默认当前时间+1h |

### 3.3 视频笔记支持

**媒体上传方式**（两种）：

1. **本地上传**：
   - 支持 mp4/mov 格式，最大 500MB
   - 上传到 `/public/upload/` 或云存储
   - 上传进度条显示

2. **视频URL输入**：
   - 粘贴已有视频链接
   - 系统验证URL有效性

**发布到小红书**：
- 小红书没有官方发布API，视频笔记需通过浏览器自动化发布
- 方案：创建草稿 → 用户手动在小红书发布 → 回填发布结果
- 或：未来接入小红书开放平台API（如果开放）

### 3.4 草稿箱

新增"草稿箱"入口（可放在账号中心或内容库）：

```
┌─────────────────────────────────────────────┐
│ 草稿箱                        [+ 新建草稿]   │
│─────────────────────────────────────────────│
│ ┌─────────────┐ ┌─────────────┐             │
│ │ 标题: xxx    │ │ 标题: yyy   │             │
│ │ 类型: 图文   │ │ 类型: 视频  │             │
│ │ 状态: 草稿   │ │ 状态: 已排期│             │
│ │ [编辑] [发布]│ │ [编辑] [取消]│            │
│ └─────────────┘ └─────────────┘             │
└─────────────────────────────────────────────┘
```

### 3.5 API 设计

```
POST /api/accounts/[id]/notes
Body: {
  title, content, mediaType ("image"|"video"),
  mediaUrls: string[], tags: string[],
  publishMode: ("now"|"scheduled"),
  scheduledAt?: string  // publishMode=scheduled时必填
}
Response: { id, status: "draft"|"scheduled" }

POST /api/accounts/[id]/notes/upload-media
Content-Type: multipart/form-data
Response: { url: string }  // 上传后返回可访问URL

GET /api/accounts/[id]/drafts
Response: { drafts: [{ id, title, mediaType, createdAt, status }] }

PATCH /api/accounts/[id]/drafts/[draftId]
Body: { title?, content?, mediaUrls?, tags?, scheduledAt? }

DELETE /api/accounts/[id]/drafts/[draftId]
```

## 四、影响范围

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/components/account/note-creation-dialog.tsx` | 重写 | 完整表单 + 视频支持 |
| `src/components/account/draft-box.tsx` | 新建 | 草稿箱列表（与PRD-003共用） |
| `src/app/api/accounts/[id]/notes/route.ts` | 修改 | 创建笔记API适配新字段 |
| `src/app/api/accounts/[id]/notes/upload-media/route.ts` | 新建 | 媒体上传API |
| `prisma/schema.prisma` | 评估 | ScheduledNote 字段是否满足需求 |

## 五、验收标准

- [ ] 新建笔记表单支持图文和视频两种类型
- [ ] 视频可本地上传或粘贴URL
- [ ] 保存草稿后草稿箱可见
- [ ] 草稿可编辑、删除、排期
- [ ] 排期笔记在日历上可见
- [ ] TypeScript 编译通过，0 errors

## 六、风险

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 视频文件上传占用存储 | 中 | 低 | 限制500MB + 定期清理 |
| 小红书无发布API | 高 | 高 | 草稿+手动发布，不做自动发布 |
| 大文件上传超时 | 中 | 中 | 分片上传或前端直传云存储 |
