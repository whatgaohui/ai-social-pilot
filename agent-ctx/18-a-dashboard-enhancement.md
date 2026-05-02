# Task 18-a: Dashboard Date Range Selector & Trend Indicators

## Summary
Enhanced the Dashboard view (`src/components/views/dashboard-view.tsx`) with three key improvements:

### 1. Date Range Selector
- Added `DateRange` type (7 | 30 | 90) with state management
- Segmented control UI in header with `bg-xhs text-white` active style
- Subtle transition effect (opacity-60) when switching ranges
- Hidden on mobile via `hidden sm:flex`

### 2. Trend Indicators on Stat Cards
- `generateTrend()` function produces deterministic trend data based on key + range
- Range-specific fluctuation bounds: 7天(±5-25%), 30天(±3-15%), 90天(±1-10%)
- TrendingUp/TrendingDown icons with green/red color coding
- `text-appear` animation class on trend indicators
- Dark mode support

### 3. Typography & Spacing Polish
- Subtitle now shows `font-medium` and active range context ("运营数据概览 · 近7天")
- Timestamp: `text-[11px]` with `opacity-50`
- Stat cards grid: consistent `gap-4`
- Divider line between stats row and content below

## Verification
- ✅ `bun run lint` passes with zero errors
- ✅ Dev server running without errors
