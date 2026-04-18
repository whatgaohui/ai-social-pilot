---
Task ID: 14-a
Agent: Feature Developer
Task: AI操作自动创建版本记录

Work Log:
- Added auto-versioning to post-actions.tsx handleOptimize
- Added auto-versioning to polish-tool.tsx handlePolish
- Added auto-versioning to ab-comparison.tsx apply logic
- Added auto-versioning to cross-platform-publish.tsx
- QA: lint zero errors, page 200

Stage Summary:
- All AI operations now auto-save version snapshots for content history tracking

---
Task ID: 14-b
Agent: Feature Developer
Task: 内容排期拖拽排序

Work Log:
- Added HTML5 drag-and-drop to calendar list view
- Visual feedback: opacity, scale, border highlight (violet-500)
- GripVertical drag handle with hover visibility and cursor-grab/cursor-grabbing
- Swap scheduledDate on drop via PUT API for both posts
- 保存排序 button with AlertDialog confirmation dialog
- Sequential date assignment when saving reorder
- framer-motion layout animations for smooth reordering
- QA: lint zero errors, page 200

Stage Summary:
- Calendar list view now supports drag-to-reorder content scheduling
