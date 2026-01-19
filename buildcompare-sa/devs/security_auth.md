# Security & Authentication Specification

## 1. Overview
BuildCompare SA prioritizes user privacy and platform integrity. We operate on a zero-trust model between frontend and backend.

## 2. Dependencies
- **BLOCKER**: Frontend and Backend cannot proceed with user-specific features until this flow is defined.

## 3. Authentication Flow
We use **Supabase Auth** for identity management.

### Key Files
| File | Purpose |
|------|---------|
| `src/utils/supabase/client.ts` | Browser-side client |
| `src/utils/supabase/server.ts` | Server-side client with cookies |
| `src/utils/supabase/middleware.ts` | Session refresh logic |
| `src/middleware.ts` | Next.js middleware integration |
| `src/app/auth/callback/route.ts` | OAuth callback handler |

### User Roles
| Role | Description |
|------|-------------|
| `contractor` | Professional builders - full access |
| `supplier` | Material suppliers - product management |

### Flow
1. **Client Side**: User logs in via Email/Password or Google OAuth → Receives JWT tokens
2. **API Requests**: Frontend attaches `Authorization: Bearer <token>` to headers
3. **Middleware**: Verifies JWT and refreshes session automatically

## 4. Rate Limiting & API Protection

### Implementation
Located in `src/lib/rate-limit.ts` using sliding window algorithm.

### Configurations
| Type | Window | Max Requests | Applied To |
|------|--------|--------------|------------|
| `default` | 1 min | 100 | `/api/chat` |
| `scraping` | 1 min | 10 | `/api/analyze` |
| `auth` | 15 min | 5 | Login attempts |

### Usage
```typescript
import { checkRateLimit, getRateLimitHeaders, getClientIP } from '@/lib/rate-limit';

const clientIP = getClientIP(req);
const result = checkRateLimit(clientIP, 'scraping');
if (!result.success) {
  return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

## 5. Data Encryption
- **At Rest**: PostgreSQL TDE (Transparent Data Encryption)
- **In Transit**: TLS 1.3 for all connections

## 6. POPIA Compliance
- **Data Minimization**: Only collect email, role
- **Consent**: Explicit agreement during signup
- **Ephemeral Storage**: Rate limiter uses memory-only (no persistence)
- **Right to Erasure**: Account deletion via Supabase dashboard

## 7. CI/CD Pipeline
Located in `.github/workflows/ci.yml`:
- Runs on push to `main` and all PRs
- Steps: Install → Lint → Jest Tests

---
*Updated by Security & DevOps Agent*
