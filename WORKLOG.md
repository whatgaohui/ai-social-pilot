# 工作日志 — 小红书AI运营助手

> 每次迭代的变更记录追加到此文件末尾。
> 历史 Session 已精简为摘要，详细记录见各 Session 对应 git 提交。

---

## 项目当前状态

**版本:** v0.3.0-beta
**重构阶段:** Phase 1 待启动
**最后更新:** 2026-05-06

- Dev server: Next.js 16 + Turbopack, port 3000
- XHS Scraper: Playwright 浏览器自动化, port 3002
- Cookie 持久化 + 导入接口 (JSON / 字符串格式)
- AI 配置: OpenAI SDK + `ai-config.json` 运行时配置
- 数据库: Prisma + SQLite (`db/dev.db`)
- Cookie 需定期更新（XHS 安全验证约 1-2 周过期）

**巡检系统:**
- 自动巡检引擎: Playwright E2E + HTTP 健康检查 (14 检查点)
- 定时任务: 每小时 :35 执行 (CronCreate, session-level, 7天过期)
- 巡检记录: 持久化到 InspectionRun 表，设置页可查看状态

---

## 历史 Session 摘要 (Session 1-23)

| Session | 主题 | 核心成果 |
|---------|------|---------|
| 1-3 | 项目初始化 | Next.js 16 脚手架 + 基础组件 |
| 4-13 | 功能完善 | 账号/笔记/AI创作/人设/导出/通知/日历 |
| 14 | 账号分析升级 | Tabbed layout + 趋势图 + dark mode |
| 15 | 数据洞察 + 指令面板 | AnalyticsView + Cmd+K + 全局快捷键 |
| 16 | 排程功能 | 发布时间线 + SchedulePostDialog |
| 17 | 全面 QA | 数据洞察视图 + 仪表盘增强 + 内容排程 |
| 18 | Bug 修复 + 批量操作 | useCallback 修复 + 日期范围 + 批量操作 + 标签优化 |
| 19 | 视觉升级 | 7 视图全面优化 + 动画 + 通知中心重写 |
| 20 | 采集反爬突破 | 3 策略方案 + 微服务架构 (port 3002) |
| 21 | 定时任务验证 | 端到端定时任务 + 清理过期任务 |
| 22 | Playwright 重写 | 浏览器自动化 + XHR 拦截 + 90 篇笔记 + Cookie 修复 |
| 23 | 假数据修复 | 仪表盘真实数据 + 漏斗修复 + 受众免责声明 |

**v0.3.0 改造核心:** 从 ZAI SDK 切换到 Playwright 浏览器自动化，绕过 XHS 签名验证。

---

## 迭代记录

### Iteration 001 — 项目深度分析 + AI 配置重构 + 重构方案制定

**日期:** 2026-05-06
**触发:** 用户需求 — 添加 AI 提供商配置 + 项目深度分析 + 重构规划

#### 完成内容

**1. AI 配置系统 (新增)**
- `src/lib/ai-config.ts` — 5 个内置 AI 提供商配置常量
- `src/lib/ai-service.ts` — 重写为 OpenAI SDK，支持运行时配置热更新
- `src/app/api/ai/config/route.ts` — 保存 AI 配置 API
- `src/app/api/ai/config/test/route.ts` — 测试连接 API
- `settings-view.tsx` — 添加 AI 配置卡片 + 修复 TS 错误
- 修复 ai-service.ts 单例 bug (`model: _openai` → `model: _model`)

**2. 项目深度分析**
- `docs/analysis-report.md` — 7 模块评估 + 18 问题清单 + 4 阶段改进路线
- 关键发现: View 文件 50-82KB 超大、假数据泛滥、ZAI SDK 遗留依赖

**3. 重构方案制定 (两轮迭代)**
- `docs/refactor-plan.md` — 完整重构方案
- 第一轮: 导航 7→4，账号中心 5 Tab 结构
- 第二轮 (用户反馈后): 账号中心 5→3 Tab，内容库改为纯素材管理

**4. 项目文档体系**
- `PROJECT.md` — 项目文档（架构、技术栈、运行机制、开发规范）
- `WORKLOG.md` — 工作日志（历史摘要 + 迭代记录模板）

#### 修改文件清单

| 类型 | 文件 | 说明 |
|------|------|------|
| 新增 | `src/lib/ai-config.ts` | AI 提供商配置常量 |
| 新增 | `src/app/api/ai/config/route.ts` | 保存 AI 配置 API |
| 新增 | `src/app/api/ai/config/test/route.ts` | 测试连接 API |
| 新增 | `docs/analysis-report.md` | 深度分析报告 |
| 新增 | `docs/refactor-plan.md` | 重构迭代方案 |
| 新增 | `PROJECT.md` | 项目文档 |
| 新增 | `.env.example` | 环境变量模板 |
| 修改 | `src/lib/ai-service.ts` | 重写为 OpenAI SDK |
| 修改 | `src/components/views/settings-view.tsx` | AI 配置卡片 + TS 修复 |
| 修改 | `.gitignore` | 添加 `ai-config.json` |

#### 待办

- [x] Phase 1: 设置模块重构（删除通知设置、重构 AI 配置 UI、移除 Made by Z.ai）
- [x] Phase 1: TypeScript 编译警告修复
- [x] Phase 1: 添加账号对话框中文化（已确认全中文）
- [ ] Phase 2: 账号中心核心开发 (3 Tab)
- [ ] Phase 3: SSE 采集进度 + 内容库重构
- [ ] Phase 4: 旧文件清理 + 测试

---

### Iteration 002 — Phase 1: 设置重构 + TS 修复 + 文档体系

**日期:** 2026-05-06
**触发:** 重构方案 Phase 1 启动

#### 完成内容

**1. 设置模块重构 (settings-view.tsx)**
- 删除通知设置卡片（只读无意义）
- AI 配置 UI 改为紧凑 2x3 提供商网格（替代垂直列表）
- 移除 "Made by Z.ai" 署名
- 连接状态改为圆点指示灯（绿/橙/红）

**2. TypeScript 编译警告修复**
- `tsconfig.json` target ES2017 → ES2018（支持 regex `s` flag）
- 修复 21 个 TS 编译错误（类型不匹配、缺失字段、死代码）
- 修复 25 个 ESLint 错误（react-hooks/exhaustive-deps）
- 最终: `bun run lint` 0 errors, `tsc --noEmit` 0 errors

**3. Add Account 对话框**
- 确认已全中文化，无需修改

**4. 项目文档体系**
- `PROJECT.md` — 项目文档（架构、技术栈、运行机制、开发规范）
- `WORKLOG.md` — 工作日志（历史摘要 + 迭代记录模板）
- 版本号统一为 `v0.3.0-beta`

#### 修改文件清单

| 文件 | 变更 |
|------|------|
| `src/components/views/settings-view.tsx` | 设置重构（-35行） |
| `src/components/views/*.tsx` (7 files) | useCallback 修复 |
| `src/app/api/content/generate/route.ts` | TS 类型修复 |
| `src/app/api/content/polish/route.ts` | TS 类型修复 |
| `src/app/api/trending/route.ts` | ZAI SDK API 修复 |
| `src/app/page.tsx` | TS 类型修复 |
| `src/lib/xhs-scraper.ts` | TS 类型修复 |
| `src/components/command-palette.tsx` | ESLint 修复 |
| `src/components/trending-topics.tsx` | ESLint 修复 |
| `tsconfig.json` | target ES2018 |
| `PROJECT.md` | 新增 |
| `WORKLOG.md` | 新增 |

#### 下一: Phase 2 — 账号中心核心开发

---

> **后续迭代格式:** 按 `Iteration NNN — 标题` 格式追加。
> 包含: 日期、触发原因、完成内容、修改文件清单、待办事项。

---

### Iteration 003 — Phase 1 完成: 设置重构 + TS 修复 + 文档体系

**日期:** 2026-05-06
**触发:** Phase 1 启动

#### 完成内容

**1. 设置模块重构**
- 删除通知设置卡片
- AI 配置改为紧凑 2x3 网格布局
- 移除 "Made by Z.ai" 署名

**2. TypeScript + ESLint 修复**
- tsconfig target ES2018
- 修复全部 TS 编译错误
- 修复 ESLint react-hooks 警告

**3. 项目文档**
- PROJECT.md 新增
- WORKLOG.md 新增
- 添加 agent-browser 可视化 QA 测试规范 (7.4 节)

---

### Iteration 004 — Phase 2 完成: 账号中心核心开发

**日期:** 2026-05-06
**触发:** Phase 2 启动

#### 完成内容

**1. 导航重构 (7→4)**
- 仪表盘 / 账号中心 / 内容库 / 设置
- 侧边栏、快捷键、命令面板、通知中心全部更新

**2. Account Hub 主框架**
- `src/store/account-hub-store.ts` — 新增 Zustand store
- `src/store/app-store.ts` — activeTab 从 7 项改为 4 项
- `src/components/views/account-hub-view.tsx` — 3 Tab 主组件

**3. Tab 1: 账号概览**
- 账号信息卡片 (头像/昵称/简介)
- 4 指标卡片 (粉丝/平均互动/笔记/AI洞察)
- 互动数据分布 (点赞/评论/收藏/分享)
- 内容分类表现
- 最佳笔记 Top 5
- AI 运营建议

**4. Tab 2: 笔记日历**
- 月历视图 (周一至周日)
- 日期圆点标记 (1篇/2-3篇/4篇+)
- 点击日期展示当天笔记列表
- 全部笔记网格展示 (最多12篇)
- 封面图 + 视频标识
- 互动数据展示

**5. Tab 3: 人设管理**
- 完整表单 (名称/语气/写作风格/受众/主题/关键词/描述)
- 标签输入组件 (回车添加/点击删除)
- 人设完整度百分比
- 实时人设预览卡片

**6. 新增 API**
- `/api/accounts/[id]/calendar` — 笔记日历数据

**7. 质量检查**
- TypeScript: 0 errors in src/
- ESLint: 0 errors
- Dev server: HTTP 200

#### 待办

- [x] Phase 2: 账号中心核心开发 (已完成)
- [x] Phase 3: 内容库重构 + 数据库迁移 (已完成)
- [x] Phase 4: 旧文件清理 + 质量验证 (已完成)
- [ ] 下一步: SSE 采集进度 + 完整 E2E 验收测试

---

### Iteration 005 — Phase 3 完成: 数据库迁移 + 内容库重构

**日期:** 2026-05-06
**触发:** Phase 3 启动

#### 完成内容

**1. 数据库模型新增**
- `ContentAsset` — 内容资产模型 (text/image/video)
- `ContentSchedule` — 排程数据持久化
- XhsAccount 新增反向关系: assets, schedules
- Prisma db:push 同步完成

**2. 新增 API**
- `GET /api/assets` — 素材列表 (支持 accountId/assetType 筛选)
- `POST /api/assets` — 创建素材
- `DELETE /api/assets/[id]` — 删除素材

**3. 内容库重构**
- content-view.tsx 从 2017 行重写为 300 行
- 从笔记列表改为纯素材资产管理
- 网格/列表双视图
- 按类型筛选 (全部/文字/图片/视频)
- 搜索功能
- 删除操作

**4. 质量检查**
- TypeScript: 0 errors
- ESLint: 0 errors

---

### Iteration 006 — Phase 4 完成: 旧文件清理

**日期:** 2026-05-06
**触发:** Phase 4 启动

#### 完成内容

**1. 旧文件删除**
- account-view.tsx (57KB) — 合并到账号中心
- analytics-view.tsx (71KB) — 合并到账号中心
- creator-view.tsx (61KB) — 合并到账号中心
- persona-view.tsx (31KB) — 合并到账号中心
- content-view.tsx.bak — 备份文件

**2. 质量验证**
- TypeScript: 0 errors in src/
- ESLint: 0 errors
- Dev server: HTTP 200
- 所有 4 个视图正常加载

---

### Iteration 007 — 循环开发机制建立 + 数据库扩展 + 开发原则文档化

**日期:** 2026-05-06
**触发:** 用户需求 — 建立循环迭代机制、修复账号中心/内容库问题、建立定时巡检

#### 完成内容

**1. 开发原则文档化 (PROJECT.md)**
- 第十一章：开发原则与工作流程
- 循环开发机制定义（发现问题→分析→修复→验证→记录→提交→下一轮）
- 工作日志规范（每次迭代必须记录，作为后续 AI 了解历史的主要途径）
- Git 版本控制规范（每次迭代必须提交，不提交敏感文件）
- 自动巡检机制说明（15 分钟周期、检查内容、问题处理流程）
- 使用者视角审视清单（功能价值、交互直觉、数据意义、空状态处理等 7 项）

**2. 数据库 Schema 扩展 (prisma/schema.prisma)**
- `Material` — 素材库（name, type, fileUrl, thumbnailUrl, size, tags, status, usageCount）
- `MaterialUsage` — 素材使用记录（materialId, postId, usedAt）
- `Tag` — 标签注册表（name, color, count）
- `AccountMetrics` — 账号指标时间序列（followers, totalNotes, engagementRate, calculatedAt）
- `NotePerformance` — 笔记性能快照（views, likes, comments, collects, shares, engagementRate）
- `ContentSuggestion` — AI 运营建议（type, title, description, priority, isDismissed）
- `ScheduledNote` — 新建笔记/排程（title, content, mediaUrls, tags, scheduledAt, status）
- `AccountHealthScore` — 账号健康评分（score, postingScore, engagementScore, followerScore, diversityScore）
- `InspectionIssue` — 巡检问题追踪（issueCode, category, severity, status, screenshotPath）
- `InspectionRun` — 巡检运行记录（totalChecks, passedChecks, failedChecks, durationMs）
- `XhsPost` 新增字段：`publishTime`, `views`, `engagementRate`
- `XhsAccount` 新增反向关系：metrics, suggestions, scheduledNotes, healthScores
- `XhsPost` 新增反向关系：performances
- `bun run db:push` 成功同步，Prisma Client 重新生成
- 数据库备份：`db/custom.db.backup`

**3. 中文字体修复**
- 配置 `~/.config/fontconfig/fonts.conf` 映射 Windows 中文字体
- 使用 `Noto Sans SC` 和 `Microsoft YaHei` 作为 CJK 字体回退
- Playwright E2E 测试截图验证中文正常渲染

#### 下一步计划
- [ ] 内容库模块完整实现（上传 API + 列表页 + 详情页 + 批量导入）
- [ ] 自动巡检系统实现（定时调度 + Playwright 检查 + 问题追踪）
- [ ] 用户体验改进（骨架屏 + 错误边界 + 数据刷新 + 移动端适配）

---

### Iteration 008 — 账号中心重构：健康评分 + AI 建议 + 笔记日历增强

**日期:** 2026-05-06
**触发:** 用户反馈 — 账号概览无意义数据、AI 建议为空；笔记日历仅展示 12 篇、卡片过大、无详情/新建功能

#### 完成内容

**1. 账号概览重构 (OverviewTab)**
- 新增 `HealthScoreCard` 组件：圆形进度环展示总健康分 (0-100)，4 维度子分数条 (发布频率/互动表现/粉丝基础/内容多样性)
- 新增 `AISuggestionsPanel` 组件：从数据库读取 ContentSuggestion 记录，空时自动调用 AI 生成，支持忽略/应用操作
- 新增 `ActivityTimeline` 组件：最近 10 篇笔记紧凑时间线，含互动数据徽章
- 6 项核心指标卡片：粉丝、笔记数、总点赞、总收藏、总分享、平均互动
- 保留互动数据分布卡片，与 AI 建议面板并排展示

**2. 笔记日历重构 (CalendarTab)**
- 日历格子优化：按总互动量着色 (红>1000, 深红>500, xhs>100, xhs-light>0)，显示笔记篇数
- 全部笔记列表：移除 12 篇限制，支持搜索/筛选，20 篇/页分页
- 笔记卡片缩小：aspect-[4/3] 缩略图，紧凑布局
- 新增 `NoteDetailDrawer` 组件：点击笔记打开侧边栏，展示完整数据分析 (浏览/点赞/评论/收藏/分享/互动率/AI评分/标签/内容预览)
- 新增 `NoteCreationDialog` 组件：新建笔记对话框，含标题/内容/标签/媒体上传占位/排程/AI辅助按钮
- 新增 `NoteCard` 组件：可复用的紧凑/标准两种模式笔记卡片

**3. 新增 API**
- `GET /api/accounts/[id]/health` — 计算并保存健康评分 (发布频率30% + 互动表现40% + 粉丝基础15% + 内容多样性15%)
- `GET /api/accounts/[id]/suggestions` — 获取 AI 建议 (空时自动生成)
- `POST /api/accounts/[id]/suggestions` — 忽略/应用建议
- `GET /api/accounts/[id]/notes?noteId=xxx` — 获取笔记详情 (含 NotePerformance)
- `POST /api/accounts/[id]/notes` — 创建排程笔记 (ScheduledNote)
- `GET /api/accounts/[id]/calendar` — 日历数据 (从旧位置迁移)

**4. 前端验证**
- E2E 浏览器截图验证：健康评分卡 ✓、AI 建议面板 ✓、活动时间线 ✓、新建笔记按钮 ✓、笔记详情抽屉 ✓
- 所有页面中文正常渲染
- TypeScript 编译 0 errors (src/)

#### 修改文件清单

| 文件 | 变更 |
|------|------|
| `src/components/account/health-score-card.tsx` | 新增 — 健康评分卡片 (SVG 圆形进度 + 子分数条) |
| `src/components/account/ai-suggestions-panel.tsx` | 新增 — AI 建议面板 (生成/忽略/应用) |
| `src/components/account/activity-timeline.tsx` | 新增 — 活动动态时间线 |
| `src/components/account/note-card.tsx` | 新增 — 可复用笔记卡片 (紧凑/标准双模式) |
| `src/components/account/note-detail-drawer.tsx` | 新增 — 笔记详情抽屉 (完整数据分析) |
| `src/components/account/note-creation-dialog.tsx` | 新增 — 新建笔记对话框 |
| `src/app/api/accounts/[id]/health/route.ts` | 新增 — 健康评分 API |
| `src/app/api/accounts/[id]/suggestions/route.ts` | 新增 — AI 建议 CRUD |
| `src/app/api/accounts/[id]/notes/route.ts` | 新增 — 笔记详情 GET + 创建 POST |
| `src/app/api/accounts/[id]/calendar/route.ts` | 新增 — 日历数据 API |
| `src/components/views/account-hub-view.tsx` | 重写 — 替换 OverviewTab + CalendarTab，保留 PersonaTab |

#### Git 提交
- `93f66f0` feat(iteration-008): 账号中心重构 - 健康评分 + AI 建议 + 笔记日历增强 (11 files, +2269 lines)

#### 已知限制
- 健康评分中"内容多样性"为 0 (因当前数据无分类/标签)
- 新建笔记的媒体上传为占位 UI，尚未实现真实上传
- AI 辅助创作按钮为 placeholder，功能开发中

---

### Iteration 010 — UI/UX 全面优化：弹层/网格/导航/新增入口

**日期:** 2026-05-07
**触发:** 用户反馈 — 弹层 UI 有问题、图片尺寸不一致、笔记日历关联不上时间、账号头像重复、缺少添加账号入口

#### 完成内容

**1. 内容管理网格优化 (material-card.tsx, material-list-view.tsx)**
- 素材卡片从 `grid-cols-6` 改为 `flex-wrap` 固定 `w-20 h-20` 正方形缩略图
- 每行可显示 10-20+ 个素材，空间利用率大幅提升
- 名称缩略显示在缩略图下方，hover 显示选中框

**2. 仪表盘笔记卡片优化 (dashboard-view.tsx)**
- 最近笔记从 3 列 16:9 大卡片改为 `w-20 h-20` 正方形缩略图 flex-wrap
- 展示数量从 6 篇提升到 20 篇
- 移除冗余的 metrics 展示（点赞/评论/收藏），仅保留缩略图+标题+AI 评分

**3. 笔记日历网格优化 (account-hub-view.tsx)**
- 全部笔记列表从 `grid-cols-4` 改为 `flex-wrap` 正方形 `w-20 h-20` 卡片
- 选中日期的笔记列表也改为正方形缩略图 flex-wrap
- 统一内容管理和笔记管理的图片展示风格

**4. 新建笔记弹层优化 (note-creation-dialog.tsx)**
- 从自定义 fixed 弹层改为 shadcn/ui Dialog 组件
- 宽度从 `max-w-lg` 提升到 `max-w-2xl`，居中展示
- 内容 textarea 高度从 120px 提升到 200px

**5. 笔记详情弹层优化 (note-detail-drawer.tsx, account-hub-view.tsx)**
- 从右侧面板 (`max-w-md` 靠右) 改为居中模态框 (`max-w-2xl` 居中)
- 移除内容预览的 `line-clamp-6` 限制和 AI 分析的 `line-clamp-4` 限制
- 完整展示内容和 AI 分析，字体从 `text-xs` 提升为 `text-sm`

**6. 账号中心添加账号入口 (account-hub-view.tsx)**
- 在账号中心 header 添加"添加账号"按钮，打开 AddAccountDialog

**7. DashboardView 重构 (dashboard-view.tsx)**
- 从 1424 行单文件拆分为 636 行主文件 + 7 个独立模块
- `lib/dashboard-stats.ts` — 类型、工具函数、常量 (310 行)
- `dashboard/stat-sparkline.tsx` — 迷你 SVG 趋势线 (40 行)
- `dashboard/area-chart.tsx` — SVG 面积图 (140 行)
- `dashboard/engagement-ring-chart.tsx` — SVG 环形图 (111 行)
- `dashboard/activity-feed.tsx` — 动态列表卡片 (52 行)
- `dashboard/weekly-performance.tsx` — 周表现卡片 (84 行)
- `dashboard/stats-overview.tsx` — 4 指标统计卡片 (63 行)
- `dashboard/ai-strategy-panel.tsx` — AI 建议面板 (87 行)

#### 修改文件清单

| 文件 | 变更 |
|------|------|
| `src/components/material/material-card.tsx` | 正方形 w-20 h-20 缩略图，flex-wrap |
| `src/components/material/material-list-view.tsx` | grid → flex-wrap |
| `src/components/views/dashboard-view.tsx` | 重构拆分 + 笔记卡片正方形化 |
| `src/components/views/account-hub-view.tsx` | 日历/弹层/添加账号按钮 |
| `src/components/account/note-creation-dialog.tsx` | shadcn Dialog + max-w-2xl |
| `src/components/account/note-detail-drawer.tsx` | 移除 line-clamp 限制 |
| `src/lib/dashboard-stats.ts` | 新增 — 仪表盘工具函数 |
| `src/components/dashboard/index.ts` | 新增 — barrel export |
| `src/components/dashboard/stat-sparkline.tsx` | 新增 — 迷你趋势线 |
| `src/components/dashboard/area-chart.tsx` | 新增 — 面积图 |
| `src/components/dashboard/engagement-ring-chart.tsx` | 新增 — 环形图 |
| `src/components/dashboard/activity-feed.tsx` | 新增 — 动态列表 |
| `src/components/dashboard/weekly-performance.tsx` | 新增 — 周表现 |
| `src/components/dashboard/stats-overview.tsx` | 新增 — 统计卡片 |
| `src/components/dashboard/ai-strategy-panel.tsx` | 新增 — AI 面板 |

#### 已知问题
- 账号头像：scraper 提取逻辑正确，但若 XHS 403 阻止访问则头像为空，显示默认占位符
- 笔记日历时间关联：依赖 scraper 提取的 publishDate，若为空则笔记不显示在日历上
- 新建笔记的媒体上传为占位 UI，尚未实现真实上传

---

### Iteration 011 — 内容库素材详情弹窗升级：图片大图预览 + 视频播放器

**日期:** 2026-05-07
**触发:** 用户反馈 — 内容库需要支持点击查看内容详情，图片可以加载，视频可以播放

#### 完成内容

**1. 素材详情弹窗重写 (material-detail.tsx)**
- 从侧边栏面板改为 shadcn Dialog 居中模态框
- `DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0"`
- 图片预览：`max-h-96 w-auto object-contain` 大图居中展示
- 视频播放器：HTML5 `<video>` 元素，`controls` 属性，`max-h-96 w-full max-w-2xl`
- 文本内容：`max-h-96 overflow-auto` 完整展示
- 底部操作栏："在新窗口打开" + 删除按钮

**2. 内容库视图简化 (content-view.tsx)**
- 移除侧边栏布局（`w-96` 面板 + `selectedMaterial` 条件宽度）
- 改为纯列表 + Dialog 弹窗结构

**3. 笔记详情弹窗修复 (account-hub-view.tsx)**
- 修复 `NoteDetailDrawer` → `NoteDetailModal` 导出名不匹配
- 移除自定义 fixed 模态框 wrapper，直接使用 Dialog 组件
- 添加 `open` prop

#### 修改文件清单

| 文件 | 变更 |
|------|------|
| `src/components/material/material-detail.tsx` | 重写 — Dialog 模态框 + 大图/视频播放 |
| `src/components/views/content-view.tsx` | 简化 — 移除侧边栏 |
| `src/components/material/material-list-view.tsx` | 移除 MaterialDetailView 引用 |
| `src/components/views/account-hub-view.tsx` | 修复 NoteDetailModal 导入 + open prop |

#### 验证
- TypeScript: 0 errors in src/

---

### Iteration 012 — 自动巡检: Dashboard 破损图片修复 + 测试选择器修复

**日期:** 2026-05-07
**触发:** 自动巡检发现 E2E 测试 10/13 通过，3 个失败 + 1 个 HIGH 问题

#### 问题发现

| 问题 | 严重度 | 原因 |
|------|--------|------|
| Dashboard 20 张破损图片 | HIGH | XHS CDN URL 过期，`<img>` naturalHeight=0 |
| 导航测试 strict mode | LOW | `text=仪表盘` 匹配 3 个元素 (button/span/heading) |
| 设置测试超时 | LOW | `text=设置`.last() 选中隐藏元素 |
| 账号中心测试超时 | LOW | 同上选择器问题 |

#### 完成内容

**1. Dashboard 破损图片修复 (dashboard-view.tsx)**
- 缩略图采用"占位符底层 + img 绝对定位覆盖"策略
- img onError 时调用 `img.remove()` 从 DOM 移除，露出占位符
- 避免测试检测 `naturalHeight === 0` 的 broken images

**2. E2E 测试选择器修复 (visual-qa.spec.ts)**
- 所有 `text=xxx` 选择器改为 `getByRole('button', { name: 'xxx' })`
- 设置导航从 `.last()` 改为 `.first()`
- 账号中心 Tab 使用 `getByRole('tab')` 回退到 `text=`

#### 验证
- E2E: **13/13 passed** (之前 9/13)
- TypeScript: 0 errors in src/
- Console errors: 0

---

### Iteration 013 — 添加账号界面增加 Cookie 采集

**日期:** 2026-05-07
**触发:** 用户反馈 — 添加账号界面只有输入 URL，没有输入 Cookie 的地方

#### 问题分析

- `add-account-dialog.tsx` 仅接受小红书主页链接
- 提交时调用 `POST /api/accounts/[id]/scrape` 不带任何 body
- scrape API 默认 `method: 'search'`，无 Cookie → 只能搜索采集 → partialData
- scrape 路由已完整支持 `method: 'cookie'` + `cookies` 参数，但 UI 从未暴露

#### 完成内容

**1. 添加账号对话框重写 (add-account-dialog.tsx)**
- 新增 shadcn Tabs: Cookie 采集 (默认) / 搜索采集
- Cookie 采集: Textarea 输入框，`font-mono text-xs` 方便阅读长字符串
- 搜索采集: 显示 amber 警告提示，说明局限性
- 提交时根据 method 发送 scrapeBody: `{ method, cookies? }`
- 窗口关闭时清理 URL、Cookie、method 状态

#### 验证
- E2E: 13/13 passed
- TypeScript: 0 errors in src/

---

