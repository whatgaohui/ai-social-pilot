# Project Worklog - 小红书AI运营助手

## 项目当前状态

**状态: STABLE v3.0 Beta (AI Provider System Complete)**

- Dev server running on port 3000, Next.js 16 + Turbopack
- XHS Scraper micro-service running on port 3002
- AI Provider abstraction layer with 4 provider types + fallback chain
- API Key AES-256-GCM encryption
- Connection test API
- Enhanced Settings UI with fallback chain visualization
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
