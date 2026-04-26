# Task 6-b: Frontend Updates for Partial Scraping, Manual Input, and Demo Data

## Agent: Subagent
## Status: Completed

## Summary
Updated the frontend to properly handle partial scraping results, added manual account editing capabilities, and implemented demo data support for testing.

## Changes Made

### 1. AddAccountDialog (`src/components/add-account-dialog.tsx`)
- Checks scrape response for `partialData` and `warnings`
- Shows toast warning for partial data, toast error for complete failure
- Keeps dialog open when scraping returns partial/failing results
- Shows amber warning banner with instructions to manually edit
- Fixed Chinese quote parsing issue (single quotes)

### 2. EditAccountDialog (`src/components/edit-account-dialog.tsx`) - NEW
- Form with fields: 昵称, 简介, 地区, 粉丝数, 关注数, 获赞与收藏, 笔记数
- Calls PATCH `/api/accounts/[id]` on submit
- Pre-populates from existing account data
- Loading state during save

### 3. PATCH Endpoint (`src/app/api/accounts/[id]/route.ts`)
- Allows updating: nickname, bio, location, followers, following, likedCollected, notesCount, xhsId, avatarUrl, status
- Auto-upgrades status from 'partial'/'error' to 'success' on manual edit
- Clears errorMessage on status upgrade

### 4. AccountView (`src/components/views/account-view.tsx`)
- Amber warning banner for 'partial' status with "去补充" button
- Red error banner for 'error' status with "手动补充" button
- "编辑账号" button next to "重新采集"
- Integrated EditAccountDialog
- "加载演示数据" button on empty state

### 5. EmptyState (`src/components/empty-state.tsx`)
- Added `demoLabel` and `onDemoAction` props
- Loading state for demo button
- Responsive button layout

### 6. Demo Seed API (`src/app/api/demo/seed/route.ts`) - NEW
- Creates 1 demo account ("美食探店小达人")
- Creates 10 realistic demo posts
- Prevents duplicate creation

### 7. Types (`src/types/index.ts`)
- Added `errorMessage?: string` to XhsAccountInfo

## Lint Status
✅ Zero errors
