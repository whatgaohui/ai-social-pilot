---
Task ID: 14
Agent: Main Developer
Task: AI智能发布助手组件 (PublishingAssistant)

Work Log:
- 读取 worklog.md 了解前13轮开发成果
- 分析现有项目架构：类型定义(ContentPost, Platform, PlatformAccount)、Zustand store、API路由、shadcn/ui组件、代码风格
- 运行 lint 检查代码质量（零错误通过）

### 新增文件
- `src/app/api/platform-accounts/publish/route.ts` - 平台发布API端点
- `src/components/right-panel/publishing-assistant.tsx` - AI智能发布助手组件

### 修改文件
- `src/store/app-store.ts` - 新增 accountPanelOpen/setAccountPanelOpen 状态
- `src/components/right-panel/copywriting-output.tsx` - 集成 PublishingAssistant 组件
- `src/app/page.tsx` - 使用 store 的 accountPanelOpen 替代本地 state

### 组件功能

1. **发布就绪检查**：
   - 从 /api/platform-accounts 获取平台账号连接状态
   - 双列网格展示微信/小红书连接状态卡片
   - 已连接：绿色脉冲指示灯 + 渐变顶部边框 + 显示账号名 + "可以发布"文字
   - 未连接：虚线边框 + "去连接"按钮 → 调用 onPlatformConnect 回调打开平台账号面板
   - 加载状态：Skeleton 占位

2. **AI发布策略分析**：
   - 展开面板时自动为当前选中帖子生成发布策略
   - 调用 POST /api/ai/generate 获取AI分析结果
   - JSON解析 + 回退策略：AI返回非结构化数据时基于内容长度/类型生成基本策略
   - 策略内容包含：
     - 平台匹配度评分（0-100分，渐变进度条动画）
     - 内容长度评估（朋友圈100-200字，小红书300-500字）
     - 最佳发布时间建议
     - 话题标签推荐（Badge展示，朋友圈2-3个，小红书4-5个）
     - 优化建议tips
   - "生成策略"/"重新分析"手动触发按钮

3. **一键发布**：
   - 两个渐变发布按钮："发布到朋友圈"(绿色) + "发布到小红书"(红色)
   - 已连接平台：发送图标，点击执行发布
   - 未连接平台：警告图标，点击显示toast提示并可跳转连接
   - 发布流程：
     - 进度条动画（0→90%随机递增→100%）
     - 调用 POST /api/platform-accounts/publish
     - 后端验证账号连接 + 更新帖子状态为"published"
     - 成功toast通知（含帖子主题摘要）
   - 已发布帖子按钮变灰 + "已发布"文字 + Check图标

4. **发布历史时间线**：
   - 显示当前已发布帖子（status === "published"）
   - 垂直时间线：渐变圆形指示器 + 连接线
   - 每条记录：平台Badge + 相对时间(date-fns) + 主题标题
   - max-h-40 滚动区域

### 设计特性
- **Collapsible折叠面板**：默认收起，violet渐变图标，收起时显示"双平台已就绪"/"策略就绪"Badge
- **平台色彩编码**：微信=green-500/emerald-600, 小红书=red-500/rose-600
- **framer-motion动画**：staggered入场、进度条过渡、AnimatePresence展开/收起
- **暗黑模式兼容**：所有颜色使用 dark: 变体
- **响应式设计**：2列网格状态卡片、flex布局

### API端点
POST /api/platform-accounts/publish
- 参数：{ postId: string, platform: string }
- 验证账号连接状态 + 帖子存在性
- 模拟1.5s发布延迟
- 更新帖子状态为"published"
- 返回：{ success, post, platform, publishedAt, message }

### Store变更
- 新增 accountPanelOpen: boolean + setAccountPanelOpen(open)
- page.tsx 改用 store 状态控制 PlatformAccountPanel 弹窗
- PublishingAssistant 通过 onPlatformConnect 回调 → setAccountPanelOpen(true) 触发打开

### QA验证结果
- ✅ lint通过（零错误零警告）
- ✅ 页面编译成功（✓ Compiled in ~140ms）
- ✅ /api/platform-accounts 调用正常返回200
- ✅ 组件集成到 copywriting-output.tsx 选中帖子视图中

Stage Summary:
- 项目状态：稳定可运行，AI智能发布助手功能完整
- 本轮新增 2 个文件，修改 3 个文件
- 核心能力：平台连接状态检测、AI发布策略分析、一键发布、发布历史时间线
- 建议下一阶段优先事项：
  1. 发布历史从全局 contentPosts 筛选（当前仅显示当前选中帖子）
  2. 发布失败重试机制
  3. 定时发布队列功能
  4. 发布前内容预览确认弹窗
