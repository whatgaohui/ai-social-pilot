# 🚀 AI Social Pilot - AI社交媒体运营助手

> 朋友圈 & 小红书智能内容创作平台 | Smart Content Studio for WeChat Moments & Xiaohongshu

一个全功能的 AI 驱动社交媒体运营工具，支持朋友圈和小红书双平台，集成 AI 文案生成、数据分析、爆款灵感库等功能。

## ✨ 功能特性

### 🎯 核心功能
- **双平台切换** — 一键切换朋友圈/小红书，所有功能自动适配对应平台风格
- **AI 文案生成** — 全自动生成、碎片转文案、口水话润色三种模式
- **AI 文案优化** — 针对平台特点智能优化文案质量
- **AI 数据分析** — 基于历史数据生成运营洞察报告
- **AI 质量评分** — 6 维度评分体系（标题/内容/情感/互动/原创/平台专属）

### 📅 内容管理
- **30天内容日历** — 网格视图 + 列表视图 + 拖拽排序
- **版本历史追踪** — 字符级 diff 对比，一键恢复任意版本
- **A/B 对比测试** — 文案和标题双版本对比选择
- **多平台同步发布** — 一键改编为另一平台风格并发布

### 📊 数据分析
- **SVG 环形图** — 内容类型分布可视化
- **水平条形图** — Top 5 帖子互动排行
- **互动率指标** — 圆形进度 + 评级
- **发布时间建议** — 基于历史数据推荐最佳发布时段
- **运营报告** — 自动生成图文并茂的运营报告

### 💡 创作工具
- **爆款标题公式库** — 12 个标题公式 + AI 改写
- **AI 话题灵感** — 关键词驱动的创意话题生成
- **热门话题趋势** — 8 大行业热门话题追踪
- **创意写作提示** — 6 个写作角度启发灵感
- **文案模板库** — 朋友圈 6 个 + 小红书 8 个精选模板

### 🔧 平台专属工具
- **朋友圈模拟预览** — 高仿真手机外框预览
- **小红书笔记预览** — 仿真 APP 界面预览
- **话题标签推荐** — AI 生成 + 15 个快选标签
- **封面图生成器** — 4 种风格预设 AI 封面
- **小红书标题 A/B 测试** — 4 个标题多角度对比

### ⚙️ 系统功能
- **AI 模型配置** — 6 个免费提供商 + 自定义 OpenAI 兼容 API
- **人设管理** — 定义品牌人设驱动内容风格
- **知识库管理** — 累积专业知识提升内容质量
- **批量操作** — 批量生成、批量优化、批量状态变更
- **暗黑模式** — 完整的明暗主题支持
- **移动端适配** — 响应式设计，支持手机操作

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| **Next.js 16** | App Router, React 19 |
| **TypeScript 5** | 严格类型检查 |
| **Tailwind CSS 4** | 原子化样式 |
| **shadcn/ui** | 组件库 (New York style) |
| **Prisma ORM** | SQLite 数据库 |
| **Zustand** | 客户端状态管理 |
| **Framer Motion** | 动画库 |
| **z-ai-web-dev-sdk** | AI 能力集成 |
| **Lucide Icons** | 图标库 |
| **dnd-kit** | 拖拽排序 |

## 📁 项目结构

```
src/
├── app/
│   ├── page.tsx                    # 主页面（三栏布局 + 平台切换）
│   ├── layout.tsx                  # 根布局
│   ├── globals.css                 # 全局样式 + 动画
│   └── api/
│       ├── ai/                     # AI 相关 API
│       │   ├── generate/           # 文案生成（全自动/碎片/润色）
│       │   ├── optimize/           # 文案优化
│       │   ├── analyze/            # 数据分析
│       │   ├── batch-generate/     # 批量生成30天计划
│       │   ├── quality-score/      # AI质量评分
│       │   └── cover-generate/     # 封面图生成
│       ├── ai-config/              # AI模型配置 CRUD
│       ├── analytics/              # 数据统计
│       ├── content/                # 内容管理（含版本历史）
│       ├── export/                 # 数据导出
│       ├── knowledge/              # 知识库管理
│       ├── material/               # 素材管理
│       ├── persona/                # 人设管理
│       ├── plan/                   # 内容计划
│       └── platform-accounts/      # 平台账号管理
├── components/
│   ├── left-panel/                 # 左侧面板组件
│   │   ├── persona-form.tsx        # 人设管理表单
│   │   ├── knowledge-base.tsx      # 知识库管理
│   │   └── copywriting-templates.tsx # 文案模板库
│   ├── center-panel/               # 中间面板组件
│   │   ├── content-calendar.tsx    # 30天内容日历
│   │   ├── drag-sort-calendar.tsx  # 拖拽排序日历
│   │   └── batch-operations.tsx    # 批量操作
│   ├── right-panel/                # 右侧面板组件（24个）
│   │   ├── copywriting-output.tsx  # 文案输出主组件
│   │   ├── analytics-panel.tsx     # 数据分析（SVG图表）
│   │   ├── viral-inspiration.tsx   # 爆款灵感库
│   │   ├── operation-report.tsx    # 运营报告
│   │   ├── content-history.tsx     # 版本历史追踪
│   │   ├── quality-scorer.tsx      # AI质量评分
│   │   ├── title-ab-test.tsx       # 标题A/B测试
│   │   ├── ab-comparison.tsx       # 文案A/B对比
│   │   ├── cross-platform-publish.tsx # 多平台同步发布
│   │   ├── wechat-preview.tsx      # 朋友圈预览
│   │   ├── xiaohongshu-preview.tsx # 小红书预览
│   │   ├── xiaohongshu-templates.tsx # 小红书模板
│   │   ├── hashtag-recommender.tsx # 话题标签推荐
│   │   ├── cover-image-generator.tsx # 封面图生成
│   │   ├── fragment-tool.tsx       # 碎片转文案
│   │   ├── polish-tool.tsx         # 口水话润色
│   │   ├── formatting-optimizer.tsx # 排版优化
│   │   ├── publishing-assistant.tsx # 发布助手
│   │   └── ...                     # 更多工具组件
│   ├── ui/                         # shadcn/ui 基础组件
│   ├── ai-settings-panel.tsx       # AI模型配置面板
│   └── welcome-onboarding.tsx      # 欢迎引导页
├── lib/
│   ├── ai-client.ts                # 服务端 AI 客户端管理
│   ├── ai-providers.ts             # 预设提供商数据
│   └── db.ts                       # Prisma 数据库客户端
├── store/
│   └── app-store.ts                # Zustand 全局状态管理
└── types/
    └── index.ts                    # TypeScript 类型定义
```

## 🚀 快速开始

### 环境要求
- Node.js 18+ 或 Bun 1.0+
- SQLite（Prisma 自带）

### 安装

```bash
# 克隆仓库
git clone https://github.com/whatgaohui/ai-social-pilot.git
cd ai-social-pilot

# 安装依赖
bun install

# 初始化数据库
bun run db:push

# 启动开发服务器
bun run dev
```

访问 http://localhost:3000 即可使用。

### 常用命令

```bash
bun run dev          # 启动开发服务器
bun run lint         # 代码检查
bun run db:push      # 同步数据库 Schema
bun run db:generate  # 生成 Prisma Client
```

## 📋 开发交接

项目开发记录保存在以下文件中，用于会话间上下文传递：
- `worklog.md` — 完整开发历史（12轮迭代记录）
- `worklog_append.txt` — 增量开发记录

**恢复开发流程**：新会话中告知 AI "从 GitHub 拉取 ai-social-pilot 继续开发" 即可。

## 📜 License

MIT
