# Project Worklog - 小红书AI运营助手

## 项目当前状态

**状态: STABLE v4.0 (素材管理闭环 Complete)**

- Dev server running on port 3000, Next.js 16 + Turbopack
- XHS Scraper micro-service running on port 3002
- AI Provider abstraction layer with 5 provider types + fallback chain
- API Key AES-256-GCM encryption
- Connection test API
- Enhanced Settings UI with fallback chain visualization
- **素材管理** — Full CRUD + upload + AI analysis + AI image generation
- MediaAsset model in Prisma with AI tagging support
- LibraryView v4.0 with grid/list view, drag & drop upload, dialogs
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
