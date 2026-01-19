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

---
*Created by Lead Systems Architect*
