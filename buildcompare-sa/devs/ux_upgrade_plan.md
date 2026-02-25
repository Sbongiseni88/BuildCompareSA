# UX Upgrade Plan — BuildCompare SA

> **Created**: 25 Feb 2026  
> **Status**: ✅ Complete  
> **Goal**: Transform the app from functional to **premium-feeling** across phone and desktop.  
> **Reference**: See `frontend_dev.md` for existing component docs.

---

## Progress Tracker

| #  | Task                              | Priority | Effort | Status |
|----|-----------------------------------|----------|--------|--------|
| 1  | Replace all `alert()` with Toast  | 🔴 P0    | ~15m   | ✅ DONE |
| 2  | Bottom mobile nav bar             | 🔴 P0    | ~30m   | ✅ DONE |
| 3  | Tab persistence (localStorage)    | 🔴 P0    | ~5m    | ✅ DONE |
| 4  | Password visibility toggle        | 🔴 P0    | ~10m   | ✅ DONE |
| 5  | Page transition animations        | 🟡 P1    | ~20m   | ✅ DONE |
| 6  | Inline form validation            | 🟡 P1    | ~30m   | ✅ DONE |
| 7  | Optimistic UI for project creation| 🟡 P1    | ~25m   | ✅ DONE |
| 8  | Search/filter persistence         | 🟡 P1    | ~10m   | ✅ DONE |
| 9  | Sidebar collapse memory           | 🟡 P1    | ~5m    | ✅ DONE |
| 10 | Smart search autocomplete         | 🟢 P2    | ~30m   | ✅ DONE |
| 11 | Swipe-to-dismiss modals (mobile)  | 🟢 P2    | ~25m   | ✅ DONE |
| 12 | Notification center               | 🟢 P2    | ~45m   | ✅ DONE |
| 13 | Full-screen project detail view   | 🟢 P2    | ~40m   | ✅ DONE |
| 14 | Pull-to-refresh (mobile)          | 🟢 P2    | ~20m   | ✅ DONE |
| 15 | Button tap feedback (micro-anim)  | 🟢 P2    | ~10m   | ✅ DONE |

**Legend**: ⬜ TODO · 🔨 IN PROGRESS · ✅ DONE · ⏭️ SKIPPED

---

## Phase 1 — Quick Wins (P0)

### Task 1: Replace all `alert()` with Toast
**Why**: Native `alert()` blocks the UI thread, looks ugly on mobile, and breaks the premium feel.  
**Effort**: ~15 min  

**Files to modify**:
- `src/components/ProjectsManager.tsx` — Lines 163, 210, 231, 279, 296
- `src/components/AccountProfile.tsx` — Lines 93, 96

**Implementation**:
1. Import `useToast` from `@/contexts/ToastContext` in both components.
2. Replace every `alert('...')` with `showSuccess('...')` or `showError('...')`.
3. Replace `confirm('...')` in `AccountProfile.tsx` line 103 with the existing `ConfirmDialog` component (already used in `page.tsx` for sign-out).

**Example change**:
```tsx
// BEFORE
alert('Profile updated successfully!');

// AFTER
showSuccess('Profile updated successfully!');
```

**Acceptance**: Zero `alert()` or `confirm()` calls remain in any component.

---

### Task 2: Bottom Mobile Navigation Bar
**Why**: The sidebar is hidden behind a hamburger on mobile → requires 2 taps to navigate. A bottom nav bar matches native app conventions (WhatsApp, banking apps).  
**Effort**: ~30 min  

**Files to create**:
- `src/components/BottomNav.tsx`

**Files to modify**:
- `src/app/page.tsx` — render `<BottomNav>` below the content area on mobile
- `src/components/FloatingActionButton.tsx` — adjust positioning so FAB sits above the nav bar
- `src/app/globals.css` — add bottom nav styles if needed

**Implementation**:
1. Create `BottomNav.tsx` with 5 core tabs: Dashboard, Estimator, Search, Projects, Account.
2. Use `lg:hidden` so it only shows on mobile/tablet.
3. Active tab gets the yellow highlight (consistent with sidebar styling).
4. Add a subtle `backdrop-blur` glass effect to the bar.
5. Add `safe-area-inset-bottom` padding for phones with gesture bars (iPhone, Android 10+).
6. The main content area needs `pb-20` on mobile to prevent content hiding behind the nav bar.

**Design spec**:
```
┌─────────────────────────────────┐
│  🏠      🧮      🔍      📁  👤  │
│ Home   Estimate Search  Projects Acct│
└─────────────────────────────────┘
```
- Height: 64px + safe area
- Background: `bg-black/90 backdrop-blur-xl border-t border-slate-800`
- Active item: Yellow icon + bold label
- Inactive: `text-slate-500`

**Acceptance**: 
- Bottom nav visible on screens < 1024px.
- Tapping a tab navigates immediately.
- FAB does not overlap the nav bar.
- Sidebar hamburger remains for desktop collapse toggle.

---

### Task 3: Tab Persistence (localStorage)
**Why**: Users lose their place every time they refresh. Especially frustrating when filling out forms.  
**Effort**: ~5 min  

**Files to modify**:
- `src/app/page.tsx`

**Implementation**:
1. On `activeTab` change, save it to `localStorage` under key `buildcompare_active_tab`.
2. On mount, read from `localStorage` and set as the initial tab (fallback to `'dashboard'`).
3. Wrap in try/catch for SSR safety and incognito mode.

```tsx
// Init
const [activeTab, setActiveTab] = useState(() => {
  try {
    return localStorage.getItem('buildcompare_active_tab') || 'dashboard';
  } catch { return 'dashboard'; }
});

// Persist
useEffect(() => {
  try { localStorage.setItem('buildcompare_active_tab', activeTab); } catch {}
}, [activeTab]);
```

**Acceptance**: Refreshing the page returns to the same tab. No crash in incognito mode.

---

### Task 4: Password Visibility Toggle
**Why**: Users can't verify their password on mobile (one of the most common login UX complaints).  
**Effort**: ~10 min  

**Files to modify**:
- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`

**Implementation**:
1. Add a `showPassword` boolean state.
2. Toggle the input `type` between `"password"` and `"text"`.
3. Add an `Eye` / `EyeOff` icon button inside the password field (positioned with `absolute right-3`).
4. Use `lucide-react` icons (`Eye`, `EyeOff`).

```tsx
<div className="relative">
  <input
    type={showPassword ? 'text' : 'password'}
    // ... existing props
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
  >
    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
  </button>
</div>
```

**Acceptance**: Eye icon toggles password visibility. Works on both login and signup pages.

---

## Phase 2 — Polish & Feel (P1)

### Task 5: Page Transition Animations
**Why**: Pages currently swap with a hard cut. A smooth transition makes the app feel premium.  
**Effort**: ~20 min  

**Files to modify**:
- `src/app/page.tsx` — wrap `renderContent()` output
- `src/app/globals.css` — add transition keyframes

**Implementation**:
1. Use a `key={activeTab}` on the content wrapper to trigger re-mount animation.
2. Add a CSS `animate-page-enter` class with a subtle `opacity 0→1 + translateY(8px→0)` over 300ms.
3. Alternative approach: Use `framer-motion`'s `AnimatePresence` for exit animations too (optional, adds dependency).

**Simple approach (no extra deps)**:
```tsx
<div key={activeTab} className="animate-page-enter">
  {renderContent()}
</div>
```

```css
@keyframes page-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-page-enter {
  animation: page-enter 0.3s ease-out forwards;
}
```

**Acceptance**: Switching tabs has a visible but subtle entrance animation.

---

### Task 6: Inline Form Validation
**Why**: Forms currently just stay silent when invalid — users don't know what's wrong.  
**Effort**: ~30 min  

**Files to modify**:
- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`
- `src/components/ProjectsManager.tsx` (Create Project modal)

**Implementation**:
1. Add validation state per field (e.g., `emailError`, `passwordError`).
2. Validate on blur and on submit.
3. Show error text below the field in red (`text-red-400 text-xs mt-1`).
4. Add a red border on invalid fields (`border-red-500`).

**Validation rules**:
- **Email**: Must be valid format (simple regex or `input[type=email]` native).
- **Password**: Min 6 characters. Show strength indicator (weak/medium/strong).
- **Project Name**: Required, min 2 characters.
- **Budget**: Must be a positive number.

**Password strength indicator spec**:
```
Weak     [████░░░░░░] — red
Medium   [██████░░░░] — yellow
Strong   [██████████] — green
```

**Acceptance**: Invalid fields show inline error messages. Password shows strength. Submit button disabled until valid.

---

### Task 7: Optimistic UI for Project Creation
**Why**: After clicking "Create Project", there's a loading spinner while Supabase responds. The user stares at a modal waiting.  
**Effort**: ~25 min  

**Files to modify**:
- `src/components/ProjectsManager.tsx`

**Implementation**:
1. Immediately add a "placeholder" project to the `projects` state with a `_pending: true` flag.
2. Close the modal instantly.
3. Send the Supabase insert in the background.
4. On success: replace the placeholder with the real project (update the `id`).
5. On failure: remove the placeholder, show an error toast, and re-open the modal with the form pre-filled.

**Visual treatment for pending project**:
- Show a subtle pulsing border (`animate-pulse border-yellow-500/30`)
- Show a small "Saving..." badge instead of the status badge

**Acceptance**: Project card appears immediately after clicking "Create". No spinner blocking the UI.

---

### Task 8: Search/Filter Persistence
**Why**: Switching tabs in the SPA resets the filter state in ProjectsManager since the component unmounts.  
**Effort**: ~10 min  

**Files to modify**:
- `src/components/ProjectsManager.tsx`
- `src/components/PriceSearchHub.tsx`

**Implementation**:
1. On filter/search change, save to `sessionStorage` (clears on tab close, persists on SPA nav).
2. On mount, read from `sessionStorage`.
3. Keys: `buildcompare_projects_search`, `buildcompare_projects_filter`, `buildcompare_search_query`.

**Acceptance**: Navigate away from Projects, come back — search query and filter still applied.

---

### Task 9: Offline Mode Indicator
**Why**: The app has a service worker but gives zero feedback when connectivity is lost. Users think the app is broken.  
**Effort**: ~20 min  

**Files to create**:
- `src/components/OfflineIndicator.tsx`

**Files to modify**:
- `src/components/ClientLayout.tsx` — render the indicator

**Implementation**:
1. Use `navigator.onLine` + `window.addEventListener('online'/'offline')` to detect connectivity.
2. When offline: show a persistent banner at the top of the screen.
3. When back online: briefly show "Back online!" then auto-dismiss.
4. Style: `bg-orange-500/90` banner with WiFi-off icon.

```tsx
// Banner when offline
<div className="fixed top-0 left-0 right-0 z-[200] bg-orange-500 text-black text-center py-2 text-sm font-bold">
  📡 You're offline — some features may be limited
</div>
```

**Acceptance**: Turning off WiFi/data shows the banner. Reconnecting shows a brief "reconnected" message.

---

## Phase 3 — Advanced UX (P2)

### Task 10: Smart Search Autocomplete
**Why**: Users may not know exact material names. Autocomplete reduces friction and typos.  
**Effort**: ~30 min  

**Files to modify**:
- `src/components/PriceSearchHub.tsx`
- `src/data/categories.ts` — source of suggestion terms

**Implementation**:
1. As user types in the search input, filter `constructionCategories` items that match.
2. Show a dropdown below the input with matching results.
3. Clicking a suggestion fills the input and triggers search.
4. Highlight the matching portion of the text in the dropdown.
5. Keyboard navigation: arrow keys + Enter to select.
6. Max 6 suggestions shown.
7. Debounce the filtering (200ms).

**Acceptance**: Typing "cem" shows "Cement 42.5N", "Cement 52.5N", etc. as suggestions.

---

### Task 11: Swipe-to-Dismiss Modals (Mobile)
**Why**: On phones, tapping a small "X" button to close modals is frustrating. Swiping down is the native gesture.  
**Effort**: ~25 min  

**Files to modify**:
- `src/components/ProjectsManager.tsx` (project detail modal, create modal)
- `src/components/AIConcierge.tsx` (sidebar panel)

**Implementation**:
1. Add `touch` event listeners: `touchstart`, `touchmove`, `touchend`.
2. Track vertical swipe distance.
3. If swipe > 100px down, close the modal with a slide-down exit animation.
4. Add a visual "drag handle" bar at the top of modals (small gray pill shape).

**Drag handle design**:
```tsx
<div className="flex justify-center pt-3 pb-1 md:hidden">
  <div className="w-10 h-1 bg-slate-600 rounded-full" />
</div>
```

**Acceptance**: Swiping down on mobile dismisses modals. Desktop behavior unchanged.

---

### Task 12: Notification Center
**Why**: Users have no way to see price alerts, budget warnings, or project updates at a glance.  
**Effort**: ~45 min  

**Files to create**:
- `src/components/NotificationCenter.tsx`

**Files to modify**:
- `src/app/page.tsx` — add bell icon in header, render NotificationCenter

**Implementation**:
1. Bell icon in the header bar with an unread count badge.
2. Clicking opens a dropdown panel with notification items.
3. Notification types: `price_alert`, `budget_warning`, `system`.
4. For MVP: show mock/static notifications (real-time via Supabase realtime can come later).
5. Store read/unread state in `localStorage`.

**Acceptance**: Bell icon with count shows in header. Panel lists notification items with timestamps.

---

### Task 13: Full-Screen Project Detail View
**Why**: The current project detail is a modal — it's cramped on mobile and hard to navigate with many materials.  
**Effort**: ~40 min  

**Files to modify**:
- `src/components/ProjectsManager.tsx`

**Implementation**:
1. When `selectedProject` is set on mobile (< 1024px), render a full-screen view instead of a modal.
2. On desktop, keep the modal behavior.
3. The full-screen view should have:
   - A top header with back arrow + project name
   - Tab sections: Overview | Materials | Budget
   - Sticky "Add Material" button at the bottom
4. Use the same data from `selectedProject`.

**Acceptance**: On mobile, clicking a project card opens a full-page view with back navigation.

---

### Task 14: Pull-to-Refresh (Mobile)
**Why**: Users instinctively pull down to refresh on mobile. Nothing happens currently.  
**Effort**: ~20 min  

**Files to modify**:
- `src/components/Dashboard.tsx`
- `src/components/ProjectsManager.tsx`

**Implementation**:
1. Add `touchstart`/`touchmove`/`touchend` listeners on the scrollable container.
2. When the user pulls down > 60px from scroll position 0: trigger a data refresh.
3. Show a small spinner/indicator while refreshing.
4. Prevent native browser pull-to-refresh (which reloads the entire page) with `overscroll-behavior: none`.

**Acceptance**: Pulling down on Dashboard or Projects triggers a data reload with visual feedback.

---

### Task 15: Button Tap Feedback (Micro-animations)
**Why**: Mobile taps with no feedback feel unresponsive. Subtle scale animations add a premium feel.  
**Effort**: ~10 min  

**Files to modify**:
- `src/app/globals.css`

**Implementation**:
1. Add an `active:scale-95` utility to all `.btn-primary` and `.btn-secondary` classes.
2. Add a subtle ripple effect on tap (CSS-only approach using `::after` pseudo-element).
3. Ensure `transition-transform` is included for smooth animation.

```css
.btn-primary:active,
.btn-secondary:active {
  transform: scale(0.97);
}
```

**Acceptance**: All primary and secondary buttons visually respond to taps/clicks.

---

## Implementation Order

We will implement in this exact order:

```
Phase 1 (P0) — Do first, commit after each
├── Task 1: Replace alert() with Toast
├── Task 3: Tab persistence
├── Task 4: Password visibility toggle
├── Task 2: Bottom mobile nav
└── Task 15: Button tap feedback (quick CSS add)

Phase 2 (P1) — Polish pass
├── Task 5: Page transition animations
├── Task 6: Inline form validation
├── Task 7: Optimistic UI for projects
├── Task 8: Search/filter persistence
└── Task 9: Offline mode indicator

Phase 3 (P2) — Advanced
├── Task 10: Smart search autocomplete
├── Task 11: Swipe-to-dismiss modals
├── Task 12: Notification center
├── Task 13: Full-screen project detail
└── Task 14: Pull-to-refresh
```

---

## Rules for Implementation
1. **Commit after each task** — keeps diffs small and easy to debug.
2. **Test on mobile** after every UI change (Chrome DevTools → responsive mode).
3. **No new dependencies** unless absolutely necessary (prefer CSS/vanilla over npm packages).
4. **Update `frontend_dev.md`** after each completed task with the new component docs.
5. **Use existing design system** — yellow/black/slate palette, `glass-card`, `btn-primary`, etc.
6. **Follow Tailwind-only styling** — no custom CSS unless it's a reusable utility in `globals.css`.

---

## Notes
- The auth race condition causing infinite loading was fixed on 25 Feb 2026 (see `useAuth.ts` and `ProtectedRoute.tsx`).
- Toast system (`ToastContext.tsx` + `Toast.tsx`) is fully built and ready — just not used everywhere yet.
- `ConfirmDialog` component exists and supports `danger`/`warning`/`info` variants.
- Service Worker (`sw.js`) and PWA manifest are already configured.
- Supabase is the backend — all data fetching uses the browser client from `@/utils/supabase/client`.

---

*Last updated: 25 Feb 2026 — All 15 tasks complete*
