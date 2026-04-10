# BuildCompare SA — Bottleneck Fixes Tracker

> Created: 2026-04-10  
> Status: IN PROGRESS

---

## Fix Checklist

### Quick Wins (< 30 min each)

- [x] **Fix 1: Parallelize Price API Calls** ✅
  - File: `src/components/PriceSearchHub.tsx`
  - Change: Replace sequential `for` loop with `Promise.allSettled()` in `performSearch()`
  - Impact: 15-item BoQ drops from ~7.5s to ~500ms

- [x] **Fix 2: Lock Down CORS** ✅
  - File: `backend/main.py`
  - Change: Replace `allow_origins=["*"]` with specific frontend URL(s)
  - Impact: Closes security vulnerability (wildcard + credentials)

- [x] **Fix 3: Real Groq Streaming for Chat** ✅
  - File: `src/app/api/chat/route.ts`
  - Change: Use Groq `stream: true` and forward chunks directly instead of fake typing animation
  - Impact: Users see text appear immediately instead of waiting 2-5s

- [x] **Fix 4: Make RAG Endpoint Async** ✅
  - File: `backend/main.py`
  - Change: Convert `/rag/query` from `def` to `async def`; use async Groq client
  - Impact: Concurrent users no longer block each other

- [x] **Fix 5: Lazy Load Tab Components** ✅
  - File: `src/app/page.tsx`
  - Change: Use `next/dynamic` with `{ ssr: false }` for tab components not shown on initial load
  - Impact: Faster initial page load, smaller JS bundle

### Medium Effort

- [x] **Fix 6: Shared Groq Client Singleton** ✅
  - Files: `src/lib/groq.ts` (new), `src/app/api/chat/route.ts`, `src/app/api/analyze/route.ts`
  - Change: Create shared Groq client; import in both API routes
  - Impact: Single instance, connection reuse, consistent configuration

- [x] **Fix 7: Memoize Expensive Components** ✅
  - Files: `src/components/PriceSearchHub.tsx`, `src/components/ProjectsManager.tsx`
  - Change: Add `React.memo`, `useMemo`, `useCallback` to prevent unnecessary re-renders
  - Impact: Smoother UI, fewer wasted renders on every keystroke

- [x] **Fix 8: Fix Duplicate Firebase/Supabase Overlap** ✅
  - Files: `package.json`, `src/lib/firebase.ts`, `src/lib/firebase-app-check.ts`
  - Change: Remove Firebase dependency if only used for App Check; use Supabase-native security
  - Impact: ~400KB smaller frontend bundle

---

## Implementation Log

| Fix | Status | Notes |
|-----|--------|-------|
| Fix 1: Parallelize Price API Calls | ✅ Done | Replaced sequential `for` loop with `Promise.allSettled()` in `PriceSearchHub.tsx` |
| Fix 2: Lock Down CORS | ✅ Done | Added `ALLOWED_ORIGINS` env var with localhost + Vercel defaults; locked methods & headers |
| Fix 3: Real Groq Streaming | ✅ Done | Direct token streaming via Groq `stream: true`; fake stream kept only for RAG fallback |
| Fix 4: Async RAG Endpoint | ✅ Done | Wrapped sync Groq call in `asyncio.to_thread()`; also made calc endpoint async |
| Fix 5: Lazy Load Tabs | ✅ Done | 6 tab components use `next/dynamic`; Dashboard + AIConcierge remain eager |
| Fix 6: Shared Groq Singleton | ✅ Done | Created `src/lib/groq.ts`; both chat & analyze routes import from it |
| Fix 7: Memoize Components | ✅ Done | Added `useCallback`, `useMemo` to PriceSearchHub + ProjectsManager |
| Fix 8: Remove Firebase | ✅ Done | `npm uninstall firebase`; marked files as deprecated (no component imported them) |
