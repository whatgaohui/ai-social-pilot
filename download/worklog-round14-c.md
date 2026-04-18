---
Task ID: 14-c
Agent: Feature Developer
Task: 通知中心 + 发布提醒

Work Log:
- Created notification-center.tsx with NotificationBell component
- Added AppNotification type to types/index.ts
- Extended Zustand store with notification state management
- Added notification dispatch to post-actions.tsx (optimize complete, publish)
- Added notification dispatch to polish-tool.tsx (polish complete)
- Added notification dispatch to publish-to-calendar.tsx (publish to calendar)
- Smart reminders for unpublished/low-score/today content
- Quick stats mini dashboard (total posts, published rate, avg score)
- Integrated bell icon with unread badge in header
- localStorage persistence for notifications (max 20)
- QA: lint zero errors, page 200

Stage Summary:
- In-app notification center with operation history, smart reminders, quick stats
