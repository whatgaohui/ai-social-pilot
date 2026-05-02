---
Task ID: 9-a
Agent: Feature Development Agent
Task: Add major new features to the Xiaohongshu AI Operations Assistant

Work Log:

### Feature 1: Account Deletion (CRITICAL)
- Added AlertDialog import from shadcn/ui to account-view.tsx
- Added Trash2 icon import from lucide-react
- Created `deleting` state and `handleDeleteAccount` async function
- handleDeleteAccount calls DELETE /api/accounts/[id] endpoint
- On success: shows toast, clears selectedAccountId, reloads accounts
- On failure: shows error toast
- Added red-styled trash button next to "编辑" and "重新采集" buttons
- AlertDialog confirmation with title "确定删除该账号？" and description "所有相关数据（笔记、人设、草稿）将被永久删除。此操作无法撤销。"
- Cancel and destructive "确定删除" action buttons
- Button shows loading spinner during deletion
- Verified DELETE API endpoint works correctly

### Feature 2: Notification Center (NEW)
- Created src/store/notification-store.ts with Zustand:
  - Notification interface: id, type (scrape/analysis/draft/export/delete/info), title, message, read, timestamp, navigateTo, accountId
  - Actions: addNotification, markAsRead, markAllAsRead, unreadCount
  - Keeps last 50 notifications, auto-generates id and timestamp
- Created src/components/notification-center.tsx:
  - Uses Popover from shadcn/ui
  - Bell icon button with red dot badge showing unread count (max "9+")
  - Dropdown panel with notification list (max-h-80 with ScrollArea)
  - Each notification shows icon (color-coded by type), title, message, time ago
  - Unread notifications have bg-xhs-light/20 highlight and blue dot indicator
  - "全部已读" button to mark all as read
  - Click notification to mark as read and navigate to relevant view
  - Time ago formatting: 刚刚, X分钟前, X小时前, X天前
- Updated src/components/app-sidebar.tsx:
  - Added NotificationCenter import
  - Placed bell icon in sidebar header area (next to logo text)
  - Logo div now uses flex-1 for proper spacing

### Feature 3: Content Calendar View (NEW)
- Completely rewrote src/components/views/content-view.tsx:
  - Added ViewMode type: "grid" | "calendar"
  - Added viewMode state with toggle between 网格 and 日历
  - View toggle: styled border-segmented control with LayoutGrid and CalendarDays icons
  - Active toggle uses bg-xhs text-white styling
  - Created ContentCalendar component with:
    - Month navigation (prev/next, 今天 button)
    - Week day headers (日一二三四五六)
    - CSS grid-based calendar (7 columns)
    - Posts grouped by publishDate (YYYY-MM-DD)
    - Day cells show up to 2 post title pills + "+N更多" overflow indicator
    - Click pill to open post detail dialog
    - Today's date highlighted with bg-xhs-light/30 and border-xhs/30
    - Today's date number has bg-xhs text-white circular badge
    - Proper padding for days outside current month
  - Added CalendarDays, ChevronLeft, ChevronRight icon imports
  - Calendar view wraps in Card component for consistent styling

### Feature 4: Data Export (NEW)
- Created src/app/api/export/route.ts:
  - POST /api/export endpoint
  - Fetches all accounts with posts, persona, and drafts (using Prisma include)
  - Transforms to clean export format with proper JSON parsing for array fields
  - Returns structured export data with exportDate, version, and accounts array
  - Each account includes: basic info, posts (with parsed imageUrls/tags), persona, drafts
- Updated src/components/views/dashboard-view.tsx:
  - Added "导出数据" button with Download icon in header
  - Added exporting state with Loader2 spinner
  - handleExport: calls POST /api/export, creates Blob, downloads as JSON file
  - File named xhs-data-export-YYYY-MM-DD.json
  - Shows toast on success and adds notification to NotificationStore
  - Added useNotificationStore integration

### Feature 5: Enhanced Dashboard Charts (IMPROVE)
- Updated src/components/account-card.tsx:
  - Added MiniSparkline component using pure SVG
  - Sparkline renders 7 data points as an SVG path with stroke
  - Shows trend percentage with TrendingUp/TrendingDown icons
  - Green for positive, red for negative trends
  - Added engagementData prop to AccountCard
  - Sparkline appears below stats when engagementData has 2+ items
  - Wrapped in border-t divider
  - Exported MiniSparkline for reuse
- Updated src/components/views/dashboard-view.tsx:
  - Added "数据概览" section with BarChart3 icon
  - 4-item grid showing total likes, comments, collects, shares
  - Each item has colored icon background, formatted number, and trend indicator
  - Trend calculated deterministically from value (not random)
  - "近7日互动趋势" mini bar chart at bottom
  - Uses recentPosts data to generate 7-day engagement bars
  - Each bar shows day label (一-日) and engagement total on hover
  - Added generateSparklineData helper for account engagement data
  - Accounts enriched with engagementData for sparkline display
  - Added notification integration for demo data loading

### Verification
- All lint checks pass with zero errors
- Page loads correctly with all new features
- Export API tested: returns proper JSON with accounts, posts, personas, drafts
- Delete API tested: successfully removes account and cascading data
- Dev server running on port 3000

Stage Summary:
- 5 major new features added to the Xiaohongshu AI Operations Assistant
- Account deletion with AlertDialog confirmation
- Notification center with bell icon, dropdown, and Zustand store
- Content calendar view with CSS grid, month navigation, and post pills
- Data export as JSON with file download
- Enhanced dashboard with sparkline charts, weekly engagement summary, and trend indicators
- All features use Chinese labels and XHS red (#FF2442) accent color
- Zero lint errors, no new Prisma schema changes, all existing components preserved
