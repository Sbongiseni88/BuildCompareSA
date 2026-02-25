# Frontend Development Specification (Next.js)

## 1. Overview
The frontend is built using **Next.js 15 (App Router)** and **Tailwind CSS**. It serves as the primary interface for contractors to compare prices and interact with the AI Concierge.

## 2. Dependencies
- **WAIT FOR**: Backend API Endpoints (see `backend_dev.md`) for ensuring type-safe API calls.
- **WAIT FOR**: Authentication SDK setup (see `security_auth.md`).

## 3. Tech Stack & Best Practices
- **Framework**: Next.js 15 (React 18 Server Components).
- **Styling**: Tailwind CSS v4 (Utility-first).
- **State Management**: React Context / Hooks (Zustand if complexity grows).
- **Offline Capabilities**: Service Workers (PWA) to cache critical UI shells.

### Code Consistency
> "Frontend code must use Tailwind utility classes."

## 4. Component Architecture

### Price Search Hub (`src/components/PriceSearchHub.tsx`)
This is the central component for users to input queries and view results.

**Structure:**
- **SearchInput**: Debounced input field.
- **FilterBar**: Region, Supplier Type, Availability toggles.
- **ResultsGrid**: Lazy-loaded grid of `ProductCard` components.
- **ProductCard**:
  - Displays: Price, Supplier Logo, Stock Status, Last Updated.
  - Action: "Add to Project" (Optimistic UI update).

### AI Concierge UI (`src/components/AIConcierge.tsx`)
A floating or sidebar component for the RAG-based assistant.

**Integration Points:**
- **Streaming Response**: Handle streaming text from `api/chat` endpoint.
- **Context Injection**: Automatically inject current page context (e.g., "I see you're looking at cement...") into the prompt.
- **Visual Feedback**: Skeleton loaders while AI "thinks".

## 5. Offline-First Capability
- Use `next-pwa` to cache static assets (logos, fonts, core layout).
- Store "Saved Projects" in `localStorage` or IndexedDB for offline viewing, syncing when online.

## 6. UX Enhancement Components (Added Feb 2026)

### Skeleton Loaders (`src/components/SkeletonLoader.tsx`)
Exports: `SkeletonBar`, `StatsSkeleton`, `ProjectCardSkeleton`, `WelcomeSkeleton`, `SpendAnalysisSkeleton`, `SearchResultsSkeleton`.
Uses CSS `shimmer` keyframe animation defined in `globals.css`.

### Confirm Dialog (`src/components/ConfirmDialog.tsx`)
Styled modal replacement for native `confirm()`. Supports `danger`, `warning`, `info` variants with matching colors/icons.
Used in: `ProjectsManager` (delete project), `page.tsx` (sign out).

### Floating Action Button (`src/components/FloatingActionButton.tsx`)
Mobile-only (lg:hidden) FAB with expandable quick actions: New Project, Search, Scan BoQ, Ask AI.

### Onboarding Tour (`src/components/OnboardingTour.tsx`)
5-step guided tour for first-time users. Persists completion state in `localStorage` key `buildcompare_onboarding_complete`.

### Keyboard Shortcuts (`src/hooks/useKeyboardShortcuts.ts`)
Global keyboard shortcut hook. Shortcuts: `Ctrl+K` (search), `Ctrl+/` (AI), `Ctrl+N` (projects), `Esc` (close), `Ctrl+Shift+?` (help).

### Forgot Password (`src/app/forgot-password/page.tsx`)
Supabase `resetPasswordForEmail` integration. Linked from login page password field.

### Dynamic Breadcrumbs (in `page.tsx`)
Header shows `Home > [Current Page]` with page icon. Tab metadata defined in `TAB_META` map.

### CSS Additions (`globals.css`)
- `shimmer` keyframe for skeleton loaders
- `.tooltip-trigger` / `.tooltip-content` classes for hover tooltips

### Deterministic Price Engine (`src/data/mockData.ts`) — Feb 2026
Replaced `Math.random()` price generation with a stable hash-based system. Each supplier has fixed price multipliers (Cashbuild cheapest at 0.93x, Leroy Merlin premium at 1.12x). Prices are now consistent across page refreshes — critical for user trust when testers screenshot and share results.

### WhatsApp & Share Integration (`PriceSearchHub.tsx`) — Feb 2026
- **Share via WhatsApp** button: Opens `wa.me` with pre-formatted message including best deals, prices, and supplier names.
- **Share button**: Uses Web Share API (mobile) or clipboard fallback (desktop).
- Both are in the results success banner alongside Export CSV.

### PWA Support — Feb 2026
- **`public/manifest.json`**: App manifest with BuildCompare branding, shortcuts, and icon references.
- **`public/sw.js`**: Service worker with network-first caching (works offline for loadshedding scenarios).
- **`public/offline.html`**: Branded offline fallback page.
- **`src/components/PWAInstallPrompt.tsx`**: Smart install banner that:
  - Shows 3s after page load
  - Remembers dismissals for 7 days via `localStorage`
  - Highlights benefits: faster loading, works offline, no app store
- **`src/app/layout.tsx`**: Added `manifest`, `viewport` (themeColor), and `appleWebApp` metadata.
- **`src/components/ClientLayout.tsx`**: PWAInstallPrompt rendered after splash screen.

---
*Created by Lead Systems Architect*

