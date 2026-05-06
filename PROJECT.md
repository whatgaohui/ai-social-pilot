# 小红书AI运营助手 — 项目文档

> 最后更新: 2026-05-06 | 当前版本: v0.3.0-beta | 重构阶段: Phase 1 待启动

---

## 一、项目概述

**目标：** 通过 AI 帮助用户对小红书账号进行笔记的创建、优化和数据分析。

**核心工作流：**
1. 添加小红书账号 → 采集历史笔记（图文/视频/互动数据）
2. 查看账号数据分析 → 获取 AI 运营建议
3. 使用 AI 创作新笔记 → 润色/模板生成
4. 持续观察笔记表现 → 循环优化

**技术栈：**
- 前端: Next.js 16 (App Router) + TypeScript + TailwindCSS v4 + shadcn/ui
- 状态: Zustand (SPA 路由 + 全局状态)
- 后端: Next.js API Routes + Prisma ORM + SQLite
- AI: OpenAI SDK (GLM-4-Flash 等兼容模型)
- 采集: Playwright 浏览器自动化 (独立微服务, 端口 3002)

---

## 二、目录结构

```
workspace/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # 主入口 (SPA 根)
│   │   ├── layout.tsx          # 全局布局
│   │   ├── globals.css         # 全局样式 + 动画
│   │   └── api/                # API Routes (17+ 端点)
│   │       ├── accounts/       # 账号 CRUD + 采集
│   │       ├── posts/          # 笔记 CRUD
│   │       ├── personas/       # 人设管理
│   │       ├── drafts/         # 草稿管理
│   │       ├── ai/             # AI 相关 (config, test, content)
│   │       ├── export/         # 数据导出
│   │       └── assets/         # 内容资产 (待实现)
│   ├── components/
│   │   ├── views/              # 7 个主视图组件
│   │   │   ├── dashboard-view.tsx    # 仪表盘 (59KB)
│   │   │   ├── account-view.tsx      # 账号分析 (57KB)
│   │   │   ├── analytics-view.tsx    # 数据洞察 (71KB)
│   │   │   ├── content-view.tsx      # 内容库 (82KB)
│   │   │   ├── persona-view.tsx      # 人设管理 (31KB)
│   │   │   ├── creator-view.tsx      # AI 创作 (61KB)
│   │   │   └── settings-view.tsx     # 设置 (25KB)
│   │   ├── app-sidebar.tsx     # 侧边栏导航
│   │   ├── post-card.tsx       # 笔记卡片
│   │   └── ...                 # 其他 UI 组件
│   ├── lib/
│   │   ├── ai-service.ts       # AI 服务 (OpenAI SDK)
│   │   ├── ai-config.ts        # AI 提供商配置常量
│   │   ├── db.ts               # Prisma 客户端
│   │   └── xhs-scraper.ts      # 采集适配层 (转发到微服务)
│   ├── stores/
│   │   ├── app-store.ts        # 全局状态 (activeTab, 主题)
│   │   └── notification-store.ts # 通知管理
│   └── types/index.ts          # TypeScript 类型定义
├── mini-services/xhs-scraper/  # 采集微服务 (端口 3002)
│   ├── index.ts                # 服务入口 + API 路由
│   ├── browser.ts              # Playwright 浏览器管理
│   └── strategies/
│       └── browser-strategy.ts # 浏览器采集策略
├── prisma/
│   └── schema.prisma           # 数据库模型定义
├── docs/
│   ├── analysis-report.md      # 深度分析报告
│   └── refactor-plan.md        # 重构迭代方案
├── PROJECT.md                  # 项目文档 (本文件)
└── WORKLOG.md                  # 工作日志

```

---

## 三、数据模型

### 3.1 现有模型 (schema.prisma)

| 模型 | 说明 | 关键字段 |
|------|------|---------|
| `XhsAccount` | 小红书账号 | nickname, followers, bio, status, lastScrapedAt |
| `XhsPost` | 笔记 | title, content, coverUrl, postType, likes, comments, collects, shares, aiScore, category, publishDate |
| `XhsPersona` | 人设 | name, tone, writingStyle, targetAudience, contentThemes, keywords |
| `ContentDraft` | AI 草稿 | title, content, tags, status, aiModel |

### 3.2 待新增模型（重构 Phase 3）

| 模型 | 说明 | 关键字段 |
|------|------|---------|
| `ContentAsset` | 内容资产（素材管理） | assetType(text/image/video), filePath, originalUrl, thumbnailPath, scrapedAt |

### 3.3 待新增字段

| 模型 | 字段 | 类型 | 说明 |
|------|------|------|------|
| `XhsPost` | videoUrl | String | 视频 URL |
| `XhsPost` | duration | Int | 视频时长(秒) |

---

## 四、服务架构

### 4.1 主应用 (Next.js)

- **端口:** 3000
- **启动:** `bun dev` (Turbopack 模式)
- **路由:** 客户端 SPA 路由，通过 Zustand `activeTab` 控制视图切换
- **7 个视图:** dashboard / account / analytics / content / persona / creator / settings

### 4.2 采集微服务 (XHS Scraper)

- **端口:** 3002
- **启动:** `cd mini-services/xhs-scraper && bun index.ts`
- **技术:** Playwright 浏览器自动化 (Chromium)
- **采集策略:** Cookie 认证 → XHR 拦截 → DOM 解析 fallback
- **API 端点:**
  - `GET /api/health` - 健康检查
  - `POST /api/scrape/profile` - 账号+笔记采集
  - `POST /api/scrape/posts` - 笔记列表
  - `POST /api/scrape/note` - 单笔记详情
  - `POST /api/cookies/import` - Cookie 导入
  - `GET /api/cookies/status` - Cookie 状态

### 4.3 数据流

```
用户操作 → Next.js API Route → XHS Scraper (port 3002) → Playwright → 小红书页面
                              ↓
                        Prisma → SQLite (db/dev.db)
                              ↓
                        OpenAI SDK → AI 提供商 API
```

---

## 五、AI 配置机制

### 5.1 运行时配置

由于 Next.js 不支持运行时环境变量热更新，AI 配置采用 **JSON 文件方案**：

- **配置文件:** `ai-config.json` (项目根目录，已在 .gitignore 中)
- **格式:**
```json
{
  "provider": "zhipu",
  "apiKey": "your-key-here",
  "model": "glm-4-flash",
  "baseUrl": "https://open.bigmodel.cn/api/paas/v4"
}
```

### 5.2 配置保存流程

1. 前端用户在设置页面选择提供商、填写 API Key
2. POST → `/api/ai/config` 写入 `ai-config.json`
3. 调用 `resetAIClient()` 清除单例缓存
4. 下次 AI 请求时自动读取新配置

### 5.3 内置提供商

| ID | 名称 | 默认模型 | 特点 |
|----|------|---------|------|
| zhipu | 智谱 AI | glm-4-flash | 免费 100万 tokens/天 |
| siliconflow | 硅基流动 | Qwen2.5-7B | 免费开源模型 |
| aliyun | 阿里云通义 | qwen-turbo | 新用户免费额度 |
| deepseek | DeepSeek | deepseek-chat | 付费，性价比高 |
| custom | 自定义 | — | OpenAI 兼容协议 |

### 5.4 AI 服务单例模式

`ai-service.ts` 采用单例 + 配置哈希校验：
- 首次调用时初始化 OpenAI 客户端
- 每次调用对比配置哈希，变更时重建客户端
- 无配置时返回 null，各函数内部做 fallback 处理

---

## 六、采集机制

### 6.1 采集流程

1. 用户点击「采集」→ 弹出 CookieInputDialog
2. 用户从浏览器 DevTools 复制 Cookie → 粘贴提交
3. 前端 POST → `/api/accounts/[id]/scrape`
4. API Route 转发 → XHS Scraper (port 3002, `XTransformPort` 参数)
5. Scraper 启动 Playwright → 加载 Cookie → 访问小红书页面
6. XHR 拦截 `sns/web/v1/user_posted` → 解析笔记列表
7. DOM 解析 fallback → 提取粉丝/关注/获赞数
8. 数据写入 Prisma → 返回结果

### 6.2 已知限制

- **Cookie 有效期:** 约 1-2 周，需定期更新
- **发布时间:** XHS 列表 API 不返回 publishDate，需后续逐条获取
- **评论/收藏/分享:** user_posted API 仅返回 likes，其他互动字段为 0
- **IP 风控:** XHS 对频繁请求可能触发验证码

### 6.3 待改进（重构 Phase 3）

- 采集 API 改为 **SSE 流式响应**，实时推送进度
- 前端采集进度可视化组件

---

## 七、开发规范

### 7.1 启动命令

```bash
# 主应用
cd workspace && bun dev          # 开发服务器 (port 3000)

# 采集微服务
cd mini-services/xhs-scraper && bun index.ts  # (port 3002)

# 数据库
bun run db:push                  # 同步 schema
bun run db:generate              # 生成 Prisma client
bun run db:migrate               # 运行迁移

# 代码质量
bun run lint                     # ESLint
```

### 7.2 编码规范

- **不可变数据:** 始终创建新对象，不修改现有对象
- **文件大小:** 典型 200-400 行，上限 800 行
- **错误处理:** 每层显式处理错误，用户友好的错误消息
- **输入验证:** 系统边界验证所有输入，快速失败
- **中文 UI:** 所有界面文本使用中文

### 7.3 测试要求

- 最低覆盖率: 80%
- TDD 方法: 先写测试 (RED) → 实现 (GREEN) → 重构 (IMPROVE)
- 当前状态: 无任何测试文件（技术债务）

---

## 八、重构计划概要

详见 `docs/refactor-plan.md`，核心变更：

### 8.1 信息架构

导航从 7 项减到 4 项：
- **仪表盘** — 全局概览 + 快捷操作
- **账号中心** — 3 Tab: 账号概览 / 笔记日历 / 人设管理
- **内容库** — 纯素材资产管理（文字/图片/视频）
- **设置** — AI 配置 + 数据管理 + 外观

### 8.2 开发阶段

| Phase | 内容 | 预估 |
|-------|------|------|
| Phase 1 | 设置重构 + 通知清理 + 中文化 | 3-4 天 |
| Phase 2 | 账号中心核心 (3 Tab) | 5-7 天 |
| Phase 3 | SSE 采集进度 + 内容库重构 | 3-4 天 |
| Phase 4 | 旧文件清理 + 数据迁移 + 测试 | 2-3 天 |

---

## 九、已知问题与技术债务

| # | 问题 | 严重度 | 状态 |
|---|------|--------|------|
| 1 | View 文件过大 (50-82KB) | HIGH | 待 Phase 2 拆分 |
| 2 | 无测试文件 | HIGH | 待 Phase 4 补充 |
| 3 | ZAI SDK 遗留引用 | HIGH | 部分已清理 |
| 4 | 受众画像 100% 假数据 | MEDIUM | 已加免责声明 |
| 5 | 发布排程仅存 localStorage | MEDIUM | 待持久化 |
| 6 | 采集无进度反馈 | MEDIUM | 待 Phase 3 SSE |
| 7 | Cookie 过期无自动提示 | LOW | 待优化 |
| 8 | TypeScript 编译警告 (~15 处) | MEDIUM | Phase 1 修复 |

---

## 十、常用操作速查

| 操作 | 命令/路径 |
|------|----------|
| 启动开发服务器 | `bun dev` (port 3000) |
| 启动采集服务 | `cd mini-services/xhs-scraper && bun index.ts` (port 3002) |
| 更新 Cookie | POST `/api/cookies/import` (port 3002) |
| 保存 AI 配置 | POST `/api/ai/config` → 写入 `ai-config.json` |
| 测试 AI 连接 | POST `/api/ai/config/test` |
| 数据库操作 | `bun run db:push / db:migrate / db:reset` |
| 代码检查 | `bun run lint` |
| 查看项目文档 | 本文件 |
| 查看工作日志 | `WORKLOG.md` |
| 查看重构方案 | `docs/refactor-plan.md` |
| 查看分析报告 | `docs/analysis-report.md` |
