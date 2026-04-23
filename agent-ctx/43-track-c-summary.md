# Task 43 - Track C: Content Scheduling Drag Sort + Keyboard Shortcuts + Quick Stats Enhancement

## Files Modified

### 1. `src/store/app-store.ts`
- Added `reorderPosts(activeId: string, overId: string)` method to the AppState interface and implementation
- Reorders `contentPosts` array by moving item from oldIndex to newIndex

### 2. `src/components/center-panel/content-calendar.tsx`
- Added `@dnd-kit/core` imports (DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors)
- Added `@dnd-kit/sortable` imports (SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy)
- Added `@dnd-kit/utilities` import (CSS)
- Wrapped `ListItem` component with `useSortable` hook for drag-and-drop support
- Added drag handle button with `GripVertical` icon in list items
- Added visual feedback during drag: opacity (0.85), scale (1.02), elevated z-index (50), shadow ring
- Added `listViewSensors` with PointerSensor (5px distance activation) and KeyboardSensor
- Added `handleListDragEnd` callback that calls `reorderPosts` on the store
- Wrapped list view items in `DndContext` + `SortableContext` (only in list view mode)
- Updated content line padding from `pl-[82px]` to `pl-[98px]` to account for drag handle width

### 3. `src/components/keyboard-shortcuts-help.tsx`
- Added `ProTipsCard` component with amber gradient background showing 4 essential shortcuts
- Added `showTips` state toggle
- Enhanced category filter pills with count badges
- Improved category headers with card-like backgrounds (`bg-muted/40 dark:bg-muted/10`)
- Added icon containers with border styling for each category header
- Enhanced search placeholder text with examples
- Improved dark mode styling: `dark:bg-muted/10` for search input, `dark:bg-muted/10` for footer
- Added "显示/隐藏提示" toggle button in footer
- Added `AnimatePresence` for smooth tips card enter/exit animation
- Better empty state with "试试其他关键词" hint text

### 4. `src/components/quick-stats-float.tsx`
- Updated `QuickStatsData` interface with new fields: `totalContent`, `unpublishedCount`, `lastWeekTotal`, `sevenDaySparkline`
- Added `getAIScoreColor(score)` - returns color class based on score thresholds (>=80 green, >=60 amber, else rose)
- Added `getAIScoreBg(score)` - returns gradient classes for AI score icon background
- Added `SVGSparkline` component with SVG path rendering, gradient fill, and end dot indicator
- Added new imports: `TrendingDown`, `ChevronDown`, `FileStack`, `Clock`, `AlertTriangle`
- Enhanced Row 1: Total Content Count with trend arrow (vs last week) + SVG sparkline for 7-day data
- Added Row 3: Unpublished count with urgency indicator (amber >5, rose >10, pulsing warning icon)
- Enhanced AI Score row: Dynamic gradient background + color-coded text based on score
- Added 7-day bar chart sparkline at bottom with day labels and total count
- Enhanced FAB button: Urgent red ring when >10 unpublished items, "!" badge indicator
- Separated "today pending" to use different color (sky/cyan) to distinguish from total

### 5. `src/app/api/quick-stats/route.ts`
- Extended `recentScores` to take 7 items (was 3)
- Added `totalContent` - count of all content posts
- Added `unpublishedCount` - count of posts where status != 'published'
- Added `lastWeekTotal` - content count from previous week for trend comparison
- Added `sevenDaySparkline` - 7-day array with `{ day, date, count }` for sparkline chart

## Lint & Build Results
- **ESLint**: ✅ Zero errors
- **Next.js Build**: ✅ Compiled successfully in 9.1s, 69/69 static pages generated

## Summary of New Features

### Part 1: Content Scheduling Drag Sort
- Drag-and-drop reordering of posts in calendar list view using @dnd-kit
- GripVertical drag handles on each list item
- Visual feedback: opacity reduction, scale up, elevated shadow ring during drag
- Keyboard accessible (KeyboardSensor support)
- Only active in list view mode (grid/week/gantt views unaffected)

### Part 2: Keyboard Shortcuts Panel Enhancement
- "快捷键提示" (Pro Tips) card at top with 4 essential shortcuts
- Category count badges on filter pills
- Card-styled category headers with icon containers
- Toggle to show/hide tips card
- Improved dark mode with proper bg-muted/10 styling
- Better empty search state
- Auto-focused search input on open

### Part 3: Quick Stats Floating Widget Enhancement
- Total content count with trend arrow (vs last week)
- SVG sparkline chart for 7-day content volume
- Unpublished count with urgency color coding (>10 = red warning pulse)
- AI score with dynamic color coding (green/amber/rose based on threshold)
- 7-day bar chart with day labels at bottom of expanded card
- Urgent indicator on collapsed FAB button
