# Project Worklog - 小红书AI运营助手

## 项目当前状态

**状态: STABLE v5.0 (AccountHubView Deep Integration + UI/UX Visual System Refactor Complete)**

- Dev server running on port 3000, Next.js 16 + webpack (production mode)
- XHS Scraper micro-service running on port 3002
- AI Provider abstraction layer with 5 provider types + fallback chain
- API Key AES-256-GCM encryption
- Connection test API
- Enhanced Settings UI with fallback chain visualization
- **素材管理** — Full CRUD + upload + AI analysis + AI image generation
- MediaAsset model in Prisma with AI tagging support
- LibraryView v4.0 with grid/list view, drag & drop upload, dialogs
- **AccountHubView Deep Integration** — Shared header, unified account data, cross-tab navigation
- All API endpoints verified, lint clean

---

### Session 22 - AI 抽象层 + 设置中心 (PLAN-001 阶段 2)

---
Task ID: 2-A
Agent: Backend Agent
Task: Build AI Provider backend (crypto, test API, router rewrite)

Work Log:
- Created `src/lib/ai/crypto.ts` — AES-256-GCM encryption module
  - encryptApiKey() / decryptApiKey() / maskApiKey()
  - Key derived from ENCRYPTION_KEY env var via SHA-256
  - Format: iv:authTag:ciphertext (all base64)
- Created `src/app/api/ai-providers/test/route.ts` — Connection test API
  - POST /api/ai-providers/test — test provider connection
  - Loads from DB (if id provided) or uses inline config
  - Sends minimal chat request via z-ai-web-dev-sdk
  - Updates lastTestedAt/lastTestStatus/lastTestError in DB
- Rewrote `src/lib/ai/router.ts` — Multi-provider router with fallback
  - Supports 5 provider types: zhipu / deepseek / openai / ollama / custom
  - Decrypts API keys via decryptApiKey before use
  - Fallback chain: iterates active providers by priority, tries next on failure
  - webSearch enabled only when supportsWebSearch is true
  - AIClient interface unchanged for backward compatibility
- Added ENCRYPTION_KEY to .env

Stage Summary:
- Complete AI Provider backend: encryption, CRUD, test, router
- API Keys encrypted at rest (AES-256-GCM)
- Fallback chain ensures service continuity when primary provider fails
- Connection test API with DB status tracking

---
Task ID: 2-B
Agent: Frontend Agent
Task: Enhance Settings AI Model Management UI

Work Log:
- Added fallback order visualization with #1/#2 priority badges
- Added up/down arrow buttons for reordering provider priority
- Added "🔍 联网搜索" badge for providers with supportsWebSearch
- Added fallback chain explanation card with visual chain display
- Removed same-type restriction — users can add multiple providers of same type
- Enhanced empty state with step-by-step guide
- Added priority field in edit dialog
- Improved test connection UX with contextual error suggestions
- Added supportsWebSearch toggle in edit dialog (visible for zhipu/custom only)

Stage Summary:
- Settings page now fully functional for AI Provider management
- Visual fallback chain helps users understand provider priority
- Better empty state onboarding experience
- Contextual error messages for common connection issues

---

### Session 23 - 素材管理 Frontend (PLAN-001 阶段 3)

---
Task ID: 4-B
Agent: Frontend Agent
Task: Build complete LibraryView UI for material management

Work Log:
- Rewrote `src/components/views/library-view.tsx` from scaffold to production-ready (~600 lines)
- Implemented Header with asset count + two action buttons (上传素材 dropdown, AI 生成图片)
- Implemented Toolbar with debounced search (300ms), type filter tabs, view mode toggle (grid/list), sort dropdown
- Implemented Drag & Drop upload zone with click-to-upload, progress bar, MIME type validation, XHR progress tracking
- Implemented Upload Type Selector (DropdownMenu) with 上传文件 and 文字片段 options
- Implemented responsive Asset Grid View (2/3/4/5 cols) with type-specific cards, hover overlay, badges (source, AI)
- Implemented Asset List View with table-like columns and hover action buttons
- Implemented Asset Detail Dialog with full preview (image/video/text), AI analysis display, metadata editing (category, tags, description), download and delete actions
- Implemented Text Snippet Creation Dialog with content, category, tags, description fields
- Implemented AI Generate Image Dialog with prompt, size selector, category fields and loading state
- Implemented Delete Confirmation (AlertDialog) showing file name
- Implemented Loading skeleton grid/list, pagination with "load more", total count display
- Implemented Empty State with onboarding CTA buttons
- All UI in Chinese, uses brand gradient system (rose/red), dark mode compatible
- Helper functions: formatFileSize, formatRelativeDate, sourceLabel, typeLabel
- Lint clean, zero type errors in the component

Stage Summary:
- Complete LibraryView UI with all 12 required features
- Full CRUD integration with backend API endpoints via fetch()
- Responsive grid/list views with type-specific rendering
- Three dialog types: Detail, Text Creation, AI Generation
- Drag & drop + click upload with real progress tracking
- Brand-consistent styling with rose gradient system

---

### Session 24 - 素材管理 Backend (PLAN-001 阶段 3)

---
Task ID: 4-A
Agent: Backend Agent
Task: Build backend API routes for media asset management

Work Log:
- Added `MediaAssetInfo` type to `src/types/index.ts` with full field mapping
- Created `src/app/api/media/route.ts` — GET list + POST text snippet
  - GET /api/media — paginated list with type/search/category/source filters
  - POST /api/media — create text snippet with content, category, tags, description
- Created `src/app/api/media/upload/route.ts` — POST upload files
  - Supports single file (`file`) and multiple files (`files`) via FormData
  - UUID-based unique filenames, save to `public/uploads/`
  - Sharp thumbnail generation (300x300 cover fit) to `public/uploads/thumbs/`
  - Image metadata extraction (width, height)
  - MIME type validation (jpeg/png/webp/gif for images, mp4/webm for videos)
  - File size limits (5MB images, 100MB videos)
- Created `src/app/api/media/[id]/route.ts` — PATCH update + DELETE
  - PATCH — update category, tags, description, textContent
  - DELETE — remove DB record + delete file + delete thumbnail from disk
- Created `src/app/api/media/[id]/analyze/route.ts` — POST AI analyze image
  - Uses z-ai-web-dev-sdk VLM (createVision) for image analysis
  - Reads image file, converts to base64, sends to VLM with 小红书-optimized prompt
  - Parses VLM JSON response for description + tags
  - Updates aiDescription, aiTags, aiAnalyzed in DB
- Created `src/app/api/media/generate/route.ts` — POST AI generate image
  - Uses z-ai-web-dev-sdk images.generations.create
  - Saves generated base64 image to `public/uploads/`
  - Creates thumbnail via sharp
  - Creates MediaAsset record with source="ai-generated"
- Fixed Turbopack Prisma client resolution issue (hashed module name)
  - Copied @prisma/client to hashed path for Turbopack external module resolution
- Verified all endpoints with curl tests (GET, POST text, POST upload, PATCH, DELETE)
- Lint clean (0 errors)

Stage Summary:
- 5 API route files created covering all 7 endpoints
- Full CRUD support with search, pagination, filtering
- Image upload with sharp thumbnail generation and metadata extraction
- AI VLM analysis endpoint for 小红书 tag suggestions
- AI image generation endpoint with automatic asset creation
- File cleanup on delete (original + thumbnail)
- All code TypeScript with proper error handling and status codes

---

### Session 25 - 素材管理闭环 Integration (PLAN-002 Step 6)

---
Task ID: 3
Agent: Main Orchestrator
Task: Design schema, fix integration issues, verify end-to-end

Work Log:
- Added MediaAsset model to `prisma/schema.prisma` with 20 fields
- Ran `bun run db:push` to create table
- Created `public/uploads/` and `public/uploads/thumbs/` directories
- Fixed frontend API response parsing mismatch (backend returns `{success, data: {items}}` vs frontend expecting `{assets}`)
- Fixed text snippet API path (frontend called `/api/media/text` but POST `/api/media` handles text)
- Fixed AI analyze response handling to properly parse `data.asset`
- Verified lint clean and GET /api/media returns 200

Stage Summary:
- MediaAsset schema with indexes, directories created
- Frontend-backend API contract aligned
- All integration issues resolved

---

### Session 26 — UI/UX Visual System Refactor (Task 2-b)

---
Task ID: 2-b
Agent: Main Agent
Task: Unify visual system across all views — consistent headers, cards, badges, animations

Work Log:
- Added ~200 lines of new utility classes to `globals.css`:
  - `.page-container`, `.page-header` family — consistent page layout
  - `.stat-value`, `.section-title` — consistent text styles
  - `.badge-type-*`, `.badge-source-*`, `.badge-status-*` — standardized badge colors (dark mode included)
  - `.stat-icon-gradient-blue/purple` — additional icon variants
  - `.page-animate` — page transition animation
- Created 3 shared UI components in `src/components/ui/`:
  - `page-header.tsx` — Unified page header with icon + title + subtitle + actions
  - `stat-card.tsx` — Consistent stat card with icon variant, label, value, change indicator, children slot
  - `empty-state-v2.tsx` — Enhanced empty state with floating animation, gradient text, secondary action
- Refactored DashboardView:
  - Replaced inline header with `<PageHeader>` component
  - Replaced custom stat cards with `<StatCard>` component + `.stagger-item` delays
  - Standardized spacing to p-6 md:p-8 max-w-7xl mx-auto space-y-6
  - Used `btn-gradient-brand` for primary CTA button
- Refactored AnalyticsView:
  - Replaced inline header with `<PageHeader>` component
  - Standardized spacing, applied `.view-animate`
- Refactored LibraryView:
  - Replaced inline header with `<PageHeader>` component
  - Used `.badge-source-*` classes for asset source badges
  - Enhanced empty state with gradient text + brand-soft background
  - Applied `.view-animate`
- Refactored SettingsView:
  - Replaced inline header with `<PageHeader>` component
  - Expanded max-width from max-w-6xl to max-w-7xl
  - Applied `.view-animate`, used `btn-gradient-brand` for add button
- Refactored Sidebar + AccountHubView:
  - Added `.nav-item-hover` class to all sidebar buttons
  - Added `.view-animate` to AccountHubView container
  - Updated tab bar padding to px-6 md:px-8
- Lint clean (0 errors), app renders correctly

Stage Summary:
- Unified page header pattern applied to all 5 views
- Consistent stat card system via `<StatCard>` component
- Standardized badge system (type/source/status) with dark mode support
- View transitions and stagger animations across all views
- Consistent spacing (p-6 md:p-8 max-w-7xl mx-auto space-y-6)
- 3 new shared UI components for reuse

---

### Session 27 — AccountHubView Deep Integration (Task 2-a)

---
Task ID: 2-a
Agent: Main Agent
Task: Deep integration of AccountHubView — shared header, unified account data, cross-tab navigation

Work Log:

- Created `src/hooks/use-account-data.ts` — Shared account data hook
  - Fetches accounts once with 30s in-memory cache to avoid duplicate API calls
  - Syncs selectedAccountId with Zustand store (single source of truth)
  - Provides computed stats (followers, likedCollected, notesCount, following)
  - Provides formatted stats for display, engagement rate calculation
  - Fetches analysis data for the selected account
  - Returns refreshAccounts() and refreshAnalysis() methods

- Created `src/components/account-hub-header.tsx` — Shared account header component
  - Account avatar + nickname + bio + status badge (always visible)
  - Account selector dropdown (using shadcn Select with avatar thumbnails)
  - 4 stat cards row (粉丝/获赞与收藏/笔记/关注) using StatCard sub-component
  - Quick action buttons: 刷新数据, 编辑账号, + 新建笔记
  - Mobile-friendly: DropdownMenu for extra actions on small screens
  - Sticky positioning below topbar

- Updated `src/store/app-store.ts` — Cross-tab navigation state
  - Added `navigateToNotes()` — switch to notes tab from any context
  - Added `navigateToPersona()` — switch to persona tab
  - Added `navigateToOverview()` — switch to overview tab
  - Added `navigateToCreatorForAccount(accountId, topic?)` — switch to notes + open creator + set account

- Rewrote `src/components/views/account-hub-view.tsx` (v4.1)
  - Uses useAccountData hook for shared state (single fetch)
  - Shared AccountHubHeader always visible across tab switches
  - Passes sharedAccountData to child views via props
  - AccountHubContext for optional context-based data access
  - CreatorView Sheet with account context bar ("正在为 [账号名] 创建笔记")
  - Shared dialogs (EditAccountDialog, CookieInputDialog, ManualDataDialog)
  - Empty state with demo data loader

- Updated `src/components/views/account-view.tsx` — Accept shared props
  - New props: sharedAccountData, onNavigateToNotes, onOpenCreator
  - When in hub (sharedAccountData provided): hides own header/profile/stats (provided by AccountHubHeader)
  - When standalone: falls back to original behavior with full header
  - Cross-tab navigation: "查看全部" button uses onNavigateToNotes
  - Top posts cards are clickable to navigate to notes tab

- Updated `src/components/views/content-view.tsx` — Accept shared props
  - New props: sharedAccountData, onOpenCreator
  - When in hub: uses shared accounts data, compact header without title
  - When standalone: falls back to fetching own accounts
  - Accounts resolved from shared data when available

- Updated `src/components/views/persona-view.tsx` — Accept shared props
  - New props: sharedAccountData, onOpenCreator
  - When in hub: hides account selector dropdown (in shared header)
  - Added "用此人设创作" button linking to creator sheet
  - When standalone: falls back to original behavior

- Updated `src/components/views/creator-view.tsx` — Accept shared props
  - New props: sharedAccountData
  - When in hub: hides account selector (shown in Sheet header context bar)
  - Uses shared accounts data instead of independent fetch
  - Auto-fills prefilledTopic from store

- All type errors in modified files resolved
- Lint clean (0 errors)

Stage Summary:
- Shared AccountHubHeader visible across all 3 tabs (avatar, stats, selector)
- Single account data fetch via useAccountData hook with 30s cache
- Cross-tab navigation: overview → notes → persona → creator
- CreatorView Sheet pre-fills account context with "正在为 [账号名] 创建笔记"
- All child views work both inside hub (shared data) and standalone (own fetch)
- No duplicate API calls for account list across components

---

### Session 28 — Fix Material Upload Display Issues (Image + Video)

---
Task ID: 3
Agent: Main Agent
Task: Fix uploaded images/videos not displaying in material management

Work Log:
- Diagnosed root cause: Next.js standalone mode does NOT serve files added to `public/` at runtime — all `/uploads/xxx.png` URLs return 404
- Created `src/app/api/uploads/[...path]/route.ts` — API route to serve uploaded files from disk
- Discovered that using fs/path modules inside Next.js standalone API routes crashes the server process
- Changed all asset URLs from `/uploads/` to `/api/uploads/` (standalone rewrite rules don't work)
- Migrated existing 6 database records to use new URL prefix
- Fixed `saveMetadata` bug: API returns `{success, data}` but frontend was spreading entire response
- Added `sharp` to `serverExternalPackages` in next.config.ts to fix image processing crashes
- Created `mini-services/file-server/` — Bun HTTP server on port 3001 for reliable file serving
  - Uses Bun.file() for efficient zero-copy streaming
  - Serves both images and videos with correct MIME types
  - Health check endpoint at /health
- Updated Next.js uploads route to proxy requests to file-server
- Changed UPLOAD_DIR to use absolute path `/home/z/my-project/public/uploads` for consistency between dev/prod
- Removed ffmpeg/ffprobe from upload route — child_process.execFile crashes Next.js standalone server
  - Videos upload without thumbnail initially
- Updated `library-view.tsx`: fixed AssetRow video thumbnail display, improved download button
- Full E2E test passed: image upload/serve/delete ✅, video upload/serve/delete ✅

Stage Summary:
- Root cause: Next.js standalone doesn't serve runtime files; fs module crashes the server
- Solution: Independent file-server mini service (Bun, port 3001) + Next.js proxy route
- 7 files modified, 2 new files created
- Image upload + display fully working
- Video upload + display working (without auto thumbnail generation)
- Known limitation: Video thumbnails not auto-generated (ffmpeg removed to avoid crashes)
