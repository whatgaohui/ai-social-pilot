---
Task ID: 14
Agent: Feature Developer
Task: 批量操作工具组件 (Batch Operations Tool Component)

Work Log:
- 读取 worklog.md 了解前13轮开发成果
- 分析 ContentPost 接口、PostStatus 类型、Zustand store 结构
- 阅读 content-calendar.tsx 了解日历渲染逻辑（网格+列表视图）
- 运行 lint 检查代码质量（零错误通过）
- 验证 dev server 编译成功

### 新增文件
- `src/components/center-panel/batch-operations.tsx` - 批量操作工具组件（~490行）

### 组件架构
导出 5 个接口供外部集成使用：
1. **BatchOperationsProvider** - React Context Provider
2. **useBatchOperations** - 自定义 Hook
3. **BatchToolbar** - 浮动工具栏 UI
4. **BatchCheckbox** - 日历单元格内嵌复选框
5. **BatchToggleButton** - 进入/退出批量模式的切换按钮

### Context API (useBatchOperations hook)
- `isBatchMode: boolean` - 批量模式激活状态
- `toggleBatchMode()` - 切换批量模式（退出时自动清空选择）
- `exitBatchMode()` - 语义化的退出方法
- `selectedIds: Set<string>` - 已选帖子 ID 集合
- `toggleSelect(id)` - 切换单个帖子选中状态
- `selectAll(ids)` - 批量选中（替换当前选择）
- `deselectAll()` - 清空所有选择
- `isSelected(id)` - 检查是否已选中
- `selectedCount: number` - 已选数量

### BatchToolbar 浮动工具栏功能
1. **选择计数器** - Violet Badge 显示已选数量，spring scale 动画
2. **全选/取消全选** - 根据当前选择状态自动切换文字
3. **批量修改状态** (DropdownMenu) - 4种目标状态+智能推进选项，emerald 配色
4. **批量AI优化** - 逐条调用 POST /api/ai/optimize，实时进度条，violet 配色
5. **批量复制** - 剪贴板复制，含序号+主题标题格式化输出，amber 配色
6. **批量删除** (AlertDialog 确认) - 逐条调用 DELETE /api/content/:id，rose 配色

### QA验证结果
- ✅ lint通过（零错误）
- ✅ dev server 编译成功
- ✅ TypeScript 类型全部匹配（ContentPost, PostStatus, POST_STATUS_LABELS）
- ✅ shadcn/ui 组件导入正确
- ✅ 未修改任何现有文件

Stage Summary:
- 本轮新增 1 个文件：batch-operations.tsx
- 核心能力：批量选择、状态修改、AI优化（带进度条）、批量删除（带确认）、批量复制
