# Task 20-3: XHS Scraper Service Agent

## Task: Create XHS Scraping Micro-Service

## What was done:
1. Created `mini-services/xhs-scraper/package.json` - Independent bun project
2. Created `mini-services/xhs-scraper/index.ts` - 1654-line micro-service with 6 endpoints

## Key Artifacts:
- `mini-services/xhs-scraper/package.json` - bun project with z-ai-web-dev-sdk
- `mini-services/xhs-scraper/index.ts` - Full service implementation

## Endpoints:
1. `GET /api/health` - Health check
2. `POST /api/scrape/profile` - Cookie-based profile scraping (falls back to web search)
3. `POST /api/scrape/posts` - Cookie-based posts listing with pagination
4. `POST /api/scrape/note` - Cookie-based note detail
5. `POST /api/scrape/search-profile` - Web search profile (no cookies needed)
6. `POST /api/scrape/search-notes` - Web search notes (no cookies needed)

## Strategies:
1. **Cookie API (PRIMARY)**: Uses XHS internal APIs (edith.xiaohongshu.com) with user's browser cookies
2. **Web Search + LLM (FALLBACK)**: Searches third-party analytics platforms + reads pages + LLM extraction
3. **LLM Only (LAST RESORT)**: Basic analysis from URL structure

## Technical Notes:
- Port: 3002
- Rate limiting: 1.5s between XHS API calls
- CORS enabled for main app
- Response includes: scrapeMethod, warnings[], partialData
- Use `bun index.ts` (not `--hot`) for stable operation in sandbox
- All requests through gateway use `?XTransformPort=3002`
