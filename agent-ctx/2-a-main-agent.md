# Task 2-a: AccountHubView Deep Integration

## Agent: Main Agent
## Status: COMPLETED

## Summary
Deep integration of AccountHubView from a thin tab wrapper (~136 lines) to a fully integrated workspace with shared account header, unified data hook, and cross-tab navigation.

## Files Created
- `src/hooks/use-account-data.ts` — Shared account data hook with 30s cache, computed stats, analysis fetching
- `src/components/account-hub-header.tsx` — Shared account header (avatar, stats, selector, actions)

## Files Modified
- `src/store/app-store.ts` — Added cross-tab navigation methods (navigateToNotes, navigateToPersona, navigateToOverview, navigateToCreatorForAccount)
- `src/components/views/account-hub-view.tsx` — Complete rewrite with shared header, context provider, Sheet with account context bar
- `src/components/views/account-view.tsx` — Accept sharedAccountData, onNavigateToNotes, onOpenCreator props; conditional header/profile display
- `src/components/views/content-view.tsx` — Accept sharedAccountData, onOpenCreator props; use shared accounts
- `src/components/views/persona-view.tsx` — Accept sharedAccountData, onOpenCreator props; "用此人设创作" button
- `src/components/views/creator-view.tsx` — Accept sharedAccountData prop; hide selector in hub

## Key Architecture Decisions
1. **Props over Context**: Shared data is passed via props (with optional context fallback), making component relationships explicit
2. **Backward Compatibility**: All child views work standalone (own fetch) or in hub (shared data) via `isInHub` flag
3. **Single Source of Truth**: `useAccountData` hook is the single source for account data, synced with Zustand's selectedAccountId
4. **30s Cache**: In-memory cache prevents duplicate API calls across components
5. **Cross-tab Navigation**: Store methods enable navigation from any tab to any other tab

## Quality Checks
- ESLint: 0 errors
- TypeScript: 0 errors in modified files
- Dev server: Running, app responds with HTTP 200
