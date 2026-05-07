# AI 入职说明书 — 小红书AI运营助手

> 任何 AI 助手首次参与本项目开发时，请先阅读此文件。

---

## 项目简介

小红书AI运营助手 — 帮助用户管理小红书账号，自动化采集笔记数据、生成AI运营建议、创作内容素材。

**一句话**: 采集小红书账号数据 → AI 分析运营状况 → 辅助内容创作 → 持续优化笔记表现。

---

## 技术栈速查

| 层 | 技术 |
|----|------|
| 前端 | Next.js 16 (App Router) + TypeScript + TailwindCSS v4 + shadcn/ui |
| 状态 | Zustand (SPA 路由 + 全局状态) |
| 后端 | Next.js API Routes + Prisma ORM + SQLite |
| AI | OpenAI SDK (GLM-4-Flash 等兼容模型) |
| 采集 | Playwright 浏览器自动化 (独立微服务, 端口 3002) |
| 测试 | Playwright E2E 测试 |
| 包管理 | bun |

---

## 运行命令速查

```bash
cd /mnt/f/AI_works/project/ai-social-pilot/workspace

# 开发
bun dev                          # Next.js dev server (port 3000)

# 采集微服务
cd mini-services/xhs-scraper && bun index.ts  # (port 3002)

# 数据库
bun run db:push                  # 同步 schema 到 SQLite
bun run db:generate              # 生成 Prisma client

# 代码质量
bun run lint                     # ESLint 检查
npx tsc --noEmit                 # TypeScript 类型检查

# E2E 测试
npx playwright test tests/e2e/full-visual-qa.spec.ts

# 巡检脚本（手动运行）
bun scripts/inspection-runner.ts --quick
```

---

## 当前版本与阶段

- **版本**: v0.3.0-beta
- **阶段**: Phase 1-4 已完成，处于持续迭代优化中
- **主分支**: feat/refactor-account-hub

---

## 工作区结构

```
workspace/
├── docs/               # 产品文档区
│   ├── decisions/      # 技术决策记录 (ADR)
│   └── ...             # 各类分析/计划文档
├── assets/             # 视觉素材区
│   ├── design/         # 设计稿、UI 参考
│   ├── bug/            # Bug 截图
│   └── reference/      # 参考设计、竞品截图
├── notes/              # 知识沉淀区（踩坑记录）
├── src/                # 前端代码
├── scripts/            # 运维脚本
├── tests/              # 测试文件
├── prisma/             # 数据库 schema
├── mini-services/      # 采集微服务
├── AGENTS.md           # 本文件 — AI 入职说明书
├── PROJECT.md          # 完整项目文档
├── WORKLOG.md          # 工作日志
└── worklog.md          # 工作日志（小写名）
```

---

## 核心架构

### 4 个主视图

| 视图 | 文件 | 说明 |
|------|------|------|
| 仪表盘 | `src/components/views/dashboard-view.tsx` | 全局数据概览 |
| 账号中心 | `src/components/views/account-hub-view.tsx` | 3 Tab: 概览/日历/人设 |
| 内容库 | `src/components/views/content-view.tsx` | 素材资产管理 |
| 设置 | `src/components/views/settings-view.tsx` | AI 配置 + 帮助 |

### 数据流

```
用户操作 → Next.js API Route → XHS Scraper (port 3002) → Playwright → 小红书页面
                              ↓
                        Prisma → SQLite (db/dev.db)
                              ↓
                        OpenAI SDK → AI 提供商 API
```

---

## 已知问题

| 问题 | 严重度 | 状态 |
|------|--------|------|
| 采集只获取列表页数据，缺少笔记详情（正文/图片组/视频） | HIGH | 已有方案 (`docs/scraper-iteration-plan.md`)，待实施 |
| Cookie 有效期约 1-2 周，需定期手动更新 | MEDIUM | 已知，无自动续期 |
| 视频 URL 有防盗链/时效性 | MEDIUM | 待实施 |
| 部分仪表盘数据为模拟/估算值 | LOW | 随着数据采集完善逐步替换 |

---

## Git 规范

- **分支**: main (稳定), feat/xxx (功能), fix/xxx (修复)
- **提交格式**: `<类型>: <描述>` (feat, fix, refactor, docs, test, chore)
- **禁止**: `git add -A`（避免提交 .env 等敏感文件），应 `git add <具体文件>`
- **规则**: 每次迭代完成必须提交代码后才能接受新需求

详见 `docs/improvement-plan.md`。

---

## 文档索引

| 文档 | 路径 | 用途 |
|------|------|------|
| 完整项目文档 | `PROJECT.md` | 架构、技术栈、开发规范 |
| 工作日志 | `WORKLOG.md` | 迭代历史详细记录 |
| 改善方案 | `docs/improvement-plan.md` | 当前改善计划 |
| 重构计划 | `docs/refactor-plan.md` | 历史重构方案 |
| 采集器计划 | `docs/scraper-iteration-plan.md` | 笔记详情采集方案 |
| 分析报告 | `docs/analysis-report.md` | 项目深度分析 |
| E2E 报告 | `docs/e2e-iteration-report.md` | 端到端测试记录 |
| 技术决策 | `docs/decisions/` | ADR 格式决策记录 |
| 知识笔记 | `notes/` | 踩坑记录和经验总结 |

---

## 开发流程

每个需求按以下流程处理（小 bug 修复可跳过前两步）：

1. **讨论**: 明确需求，有问题先提出来
2. **计划**: 复杂功能先出方案，简单功能直接开发
3. **开发**: 编码 → lint → tsc → 测试
4. **提交**: git add 具体文件 → git commit → 更新 worklog

**重要**: 不要只写文档不提交代码。代码和文档必须在同一个 commit 中。
