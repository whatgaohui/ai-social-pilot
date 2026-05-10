# PRD-006: 视频封面缩略图

> 创建日期: 2026-05-10 | 优先级: HIGH | 预估: 0.5 天

## 问题描述

内容库中上传的视频素材没有封面缩略图，显示灰色占位符 + 视频图标。
根因：`/api/materials/route.ts` 的 `generateThumbnail` 函数只处理了图片（sharp），视频直接返回空字符串。

## 解决方案

**客户端 Canvas 提取第一帧** — 视频上传前在浏览器端提取第一帧作为缩略图，与文件一同发送到服务端。

### 为什么不用服务端 ffmpeg？

- WSL 环境无 ffmpeg，Windows 版 `.exe` 无法在 WSL 运行
- 客户端提取零服务端依赖，性能更好
- sharp 已安装用于图片，视频用浏览器原生能力

### 技术方案

#### 1. 前端 — 提取视频第一帧 (`src/lib/video-thumbnail.ts`)

```ts
// 用 <video> + <canvas> 提取视频第 1 秒帧作为缩略图
export function extractVideoThumbnail(file: File): Promise<string>
// 返回 base64 data URL (JPEG, ~300px 宽)
```

- 创建隐藏的 `<video>` 元素加载文件
- 跳转到 1 秒处（或视频总长度的 10%）
- 用 `<canvas>` 绘制当前帧
- 导出为 `data:image/jpeg;base64,...`

#### 2. 上传弹窗 — 集成缩略图提取 (`src/components/material/upload-modal.tsx`)

- `handleFiles` 中，对视频文件先调用 `extractVideoThumbnail`
- 将缩略图 base64 通过 `thumbnail` field 与文件一同发送到 `/api/materials`

#### 3. 服务端 — 接收并保存缩略图 (`src/app/api/materials/route.ts`)

- `POST` 端点读取 `formData.get('thumbnail')`
- 将 base64 转为图片文件保存到 `thumbs/` 目录
- 存入 `thumbnailUrl` 字段

#### 4. 笔记创建对话框 — 视频上传也提取封面 (`src/components/account/note-creation-dialog.tsx`)

- `handleVideoUpload` 中，视频上传成功后额外提取封面
- 封面图存入 `ScheduledNote.coverPrompt` 或新增字段

## 验收标准

- [ ] 上传视频素材后，内容库网格视图显示视频第一帧缩略图
- [ ] 缩略图上有视频播放图标覆盖层
- [ ] 列表视图同样显示视频缩略图
- [ ] 旧视频素材（已有但无缩略图）不影响新上传
- [ ] 大视频（100MB+）也能在合理时间内提取缩略图（< 5s）
- [ ] E2E 测试覆盖视频上传流程

## 变更文件

| 文件 | 变更 |
|------|------|
| `src/lib/video-thumbnail.ts` | 新增：视频第一帧提取工具 |
| `src/components/material/upload-modal.tsx` | 修改：上传前提取缩略图 |
| `src/app/api/materials/route.ts` | 修改：接收并保存缩略图 |
| `src/components/account/note-creation-dialog.tsx` | 可选：笔记视频也提取封面 |

