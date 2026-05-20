---
Task ID: 2-A
Agent: Backend Agent
Task: Build AI Provider backend (crypto, test API, router rewrite)

Work Log:
- Created `/src/lib/ai/crypto.ts` — AES-256-GCM encryption module with encryptApiKey, decryptApiKey, maskApiKey functions
  - Uses Node.js crypto module with SHA-256 derived key from ENCRYPTION_KEY env var
  - Format: `iv:authTag:ciphertext` (all base64)
  - maskApiKey shows first 4 + "****" + last 4 chars, or "未设置" for empty
- Created `/src/app/api/ai-providers/test/route.ts` — Connection test API
  - Accepts id (optional existing provider) or inline config (type, baseUrl, apiKey, model)
  - Loads provider from DB if id provided, merges with body overrides
  - Uses z-ai-web-dev-sdk to send minimal chat completion request ("你好，请回复'连接成功'" with max_tokens=20)
  - Measures elapsed time, returns { success, data: { elapsed, response } }
  - On failure returns { success: false, error: message }
  - Updates provider's lastTestedAt/lastTestStatus/lastTestError in DB when id provided
- Rewrote `/src/lib/ai/router.ts` — Multi-provider router with fallback chain
  - Supports zhipu (chat + webSearch), deepseek, openai, ollama, custom provider types
  - Decrypts API keys via decryptApiKey before use
  - Builds ZAI SDK instances with provider-specific baseUrl and apiKey
  - Fallback chain: tries all active providers ordered by isDefault DESC, priority DESC
  - webSearch only enabled when provider.supportsWebSearch is true (uses sdk.functions.invoke)
  - AIClient interface unchanged (chat + optional webSearch) for backward compatibility
- Added `ENCRYPTION_KEY=ai-social-pilot-dev-key-2024-change-in-prod` to `.env`
- Ran lint — all new files pass; remaining issues are pre-existing in other files

Stage Summary:
- All 4 files created/modified successfully
- crypto.ts: AES-256-GCM encryption with env-based key, format iv:authTag:ciphertext
- test/route.ts: POST /api/ai-providers/test with DB integration and status tracking
- router.ts: Multi-provider with fallback chain, provider-specific SDK config, webSearch for zhipu
- .env: ENCRYPTION_KEY added for dev environment
- Lint clean for all new/modified files
