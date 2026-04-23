# Track D: 键盘快捷键系统 + 命令面板 + 无障碍优化 (第38轮)

## 新增文件

### 1. `src/hooks/use-keyboard-shortcuts.tsx` (重写)
- **ShortcutManagerProvider**: React Context 提供全局快捷键注册系统
- **useShortcutManager()**: 获取快捷键管理器实例（register/unregister/getConflicts/getAllShortcuts）
- **useShortcutConflict()**: 快捷键冲突检测 Hook
- **useKeyboardShortcuts()**: 增强版全局快捷键 Hook
  - 新增 ⌘N 新建内容、⌘B 编辑器加粗
  - 支持 `comboToKey()` / `matchesCombo()` 工具函数
  - `SHORTCUT_LIST` 扩展到 17 个快捷键，分类更细（全局/编辑/AI/导航/平台/日历）

### 2. `src/components/keyboard-shortcuts-help.tsx` (新建)
- **KeyboardShortcutsHelp** 组件（替代旧版 dialog）
  - 26 个快捷键，7 个分类（全局/编辑/AI/导航/平台/日历/设置）
  - 搜索过滤（输入框 + 分类标签筛选）
  - 每个快捷键：图标 + 键位组合 + 描述 + 自定义/重置按钮
  - **KeyRecorderDialog**: 录制自定义快捷键的对话框
  - 暗黑模式兼容、ARIA 属性（role="tablist", aria-selected）

### 3. `src/components/ui/accessibility-announcer.tsx` (新建)
- **AccessibilityAnnouncer**: 渲染两个隐藏的 aria-live region（polite + assertive）
- **announce()** / **announcePolite()** / **announceAssertive()**: 程序化播报消息
- **A11Y_MESSAGES**: 21 个常用无障碍消息常量（保存/复制/发布/错误等）
- **useAnnounce()** Hook

### 4. `src/hooks/use-focus-trap.ts` (新建)
- **useFocusTrap()**: 焦点陷阱 Hook（Tab 循环、Escape 关闭、初始/恢复焦点）
- **useDialogFocusTrap()**: 简化版对话框焦点管理
- `getFocusableElements()` / `getFirstFocusable()` 辅助函数

### 5. `src/hooks/use-screen-reader.ts` (新建)
- **useScreenReader()**: 屏幕阅读器检测（media query + 鼠标移动启发式）
- **useHighContrast()**: 高对比度模式检测（forced-colors）
- **useReducedMotion()**: 减少动画偏好检测
- **useKeyboardNav()**: 键盘导航检测（Tab 键 / 鼠标事件）
- **useAccessibilityPrefs()**: 组合 Hook
- **useSkipNavigation()**: 跳过导航链接 Hook

## 修改文件

### 6. `src/components/command-palette.tsx` (增强)
- COMMAND_GROUPS 从 5 组扩展到 7 组，新增「导航」和「AI 工具」分类
- 命令总数从 15 个增加到 30 个
- 新增命令：切换日历视图、切换数据分析、切换模板市场、AI 优化/评分/错别字检查/智能排期/封面生成、生成周报、显示快捷键帮助、数据库管理等
- handleAction 新增 `_left-calendar`、`_workspace`、`_templates`、`_publish-queue`、`_export`、`_import`、`_show-shortcuts` 等动作
- 新增 `Compass` 图标导入

### 7. `src/components/lazy-components.tsx` (修改)
- `LazyKeyboardShortcutsDialog` 指向新的 `keyboard-shortcuts-help.tsx`

### 8. `src/app/page.tsx` (集成)
- 引入 `ShortcutManagerProvider` 包裹整个应用
- 引入 `AccessibilityAnnouncer` 组件（屏幕阅读器 live regions）
- 添加 skip navigation 链接（跳到主要内容）
- 监听 `open-shortcuts-help` 自定义事件（命令面板可触发快捷键帮助）
- 对话框打开时 `announce()` 播报消息（命令面板/快捷键帮助）

## 代码质量
- ESLint: ✅ 零错误
- Build: ✅ 干净
- Dev Server: ✅ 正常运行
