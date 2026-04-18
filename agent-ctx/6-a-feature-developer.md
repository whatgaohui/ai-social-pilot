---
Task ID: 6-a
Agent: Feature Developer
Task: 新增日历列表视图+一键发布到日历+AB对比+最佳发布时间建议

Work Log:
- 阅读 worklog.md 了解项目上下文和现有架构
- 阅读 src/types/index.ts、src/store/app-store.ts 了解类型定义和状态管理
- 阅读 src/components/center-panel/content-calendar.tsx 了解日历组件结构
- 阅读 src/components/right-panel/copywriting-output.tsx 了解文案输出组件结构
- 阅读 src/app/api/content/route.ts 和 [id]/route.ts 了解 API 接口
- 阅读 src/components/right-panel/analytics-panel.tsx 了解分析面板结构

### Feature 1: 日历列表视图切换
- 修改 content-calendar.tsx，添加 viewMode state ('grid' | 'list')
- 在日历头部（月份导航与一键生成按钮之间）添加 LayoutGrid/List 图标切换按钮
- 列表视图按日期排序展示所有有内容的帖子
- 每个列表项显示：日期（M月d日 EEEE格式）、ContentType Badge、Topic、内容前80字、Status Badge、AI Score、互动数据
- 点击列表项选中帖子（与网格视图一致）
- 选中项有 ring 高亮效果
- 使用 framer-motion AnimatePresence 实现视图切换动画

### Feature 2: 发布到日历
- 在 Zustand store 新增 addContentPost 方法
- 修改 copywriting-output.tsx，添加发布表单状态管理
- 在"无帖子选中"视图添加"发布到日历"卡片
- 在"已选中帖子"视图添加折叠式"发布新内容到日历"区域
- 表单包含：主题输入、文案输入、内容类型选择（7种类型）、日期选择器
- 提交调用 POST /api/content 创建新帖子
- 创建成功后更新 store 并显示成功 toast
- 无计划时显示警告提示

### Feature 3: A/B 对比测试
- 新建 ab-comparison.tsx 组件
- 使用 Collapsible 实现折叠/展开
- 点击"生成替代版本"调用 /api/ai/generate 生成B版本
- 两个版本并排显示，A版本为当前内容，B版本为AI生成
- 用户点击选择偏好版本（有视觉反馈）
- 应用选中的版本通过 PUT /api/content/:id 更新
- 支持重新生成、复制内容
- 集成到 copywriting-output.tsx 的选中帖子视图中

### Feature 4: 最佳发布时间建议
- 新建 time-suggestions.tsx 组件
- 基于历史互动数据分析：
  - 按星期几分组，计算平均互动指数
  - 按内容类型分组，找出高互动类型
  - 基于总互动量推荐时段
- 显示3个推荐时间段，含分数和原因
- 无互动数据时显示通用建议（早间/午间/晚间）
- 包含运营小贴士
- 集成到 analytics-panel.tsx 中（AI分析之前）

Stage Summary:
- 新增 2 个文件：ab-comparison.tsx、time-suggestions.tsx
- 修改 4 个文件：app-store.ts、content-calendar.tsx、copywriting-output.tsx、analytics-panel.tsx
- lint 通过（零错误）
- 所有 4 个功能已实现并集成
- 代码风格与现有项目一致（使用 shadcn/ui、framer-motion、Tailwind CSS）
