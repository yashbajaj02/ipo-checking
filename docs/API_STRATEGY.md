# API Strategy & Route Handlers

## 1. Architectural Principles

- **External API Decoupling:** External third-party APIs (Upstox, IPO Guru, IPO Alerts) are **NEVER called directly from the client browser**. All external fetches are isolated within backend ingestion handlers.
- **Client Read Strategy:** Next.js Server Components query Neon PostgreSQL directly via Drizzle ORM. Client-side components consume normalized endpoints backed by Edge caching.
- **Category Query Support:** Public endpoints dynamically filter by IPO Type (`category=MAINBOARD` [default], `category=SME`, or `category=ALL`).
- **Refresh vs. Cache Distinction:**
  - **Data Refresh Frequency:** How often our backend polls external providers (scheduled 2-4x daily or via manual trigger).
  - **Page/API Cache Duration:** How long Vercel Edge / browser retains cached JSON before revalidating against Neon DB (2-5 minutes).
- **Snapshot Presentation (No Fake Real-Time):** Non-official or polling-based data (GMP, subscription) is explicitly served with timestamp metadata: `Last updated: DD/MM/YYYY HH:mm IST`.

---

## 2. Ingestion & Refresh Strategy Matrix

| Operation | Trigger / Mechanism | Target Schedule | Data Flow | External API Impact |
|---|---|---|---|---|
| **Scheduled Ingestion** | GitHub Actions Workflow (`.github/workflows/hourly-ipo-ingestion.yml`) calling `POST /api/ingest/trigger` | Hourly (`0 * * * *`) | Active Provider (IPO Alerts -> IPO Guru fallback) → Backend Ingestion → Neon DB | 1 call/hour max per provider |
| **Manual / Ad-hoc Ingestion** | Protected `POST /api/ingest/trigger` (Auth: `CRON_SECRET`) | On-demand (admin sync or GitHub dispatch) | Active Provider → Backend Ingestion → Neon DB | Triggered strictly by admin |
| **Public IPO Catalog Read** | Next.js ISR (`revalidate = 300`) | On-demand with 5-minute background regeneration | Client ← Vercel Edge Cache ← Neon DB | **0 external API calls** |
| **GMP / Subscription Read** | HTTP Route (`s-maxage=120, stale-while-revalidate=600`) | On-demand with 2-minute Edge cache | Client ← Vercel Edge Cache ← Neon DB | **0 external API calls** |
| **Allotment Check (Deferred)** | Ephemeral `POST /api/allotment/check` | On-demand user action | Client → Next.js Route (RAM) → Registrar API | Direct registrar lookup; zero DB write |

---

## 3. Public & Internal API Route Inventory

### 3.1 Public Read Endpoints

#### `GET /api/ipos`
- **Description:** Retrieve list of IPOs filtered by category and status.
- **Query Parameters:**
  - `category` (enum: `MAINBOARD` | `SME` | `ALL`, **Default: `MAINBOARD`**)
  - `status` (enum: `UPCOMING` | `OPEN` | `CLOSED` | `LISTED`, optional)
  - `search` (string, optional - searches company name and symbol)
  - `limit` (integer, default: 20)
  - `page` (integer, default: 1)
- **Filter Resolution:**
  - `category=MAINBOARD` → `WHERE category = 'MAINBOARD'`
  - `category=SME` → `WHERE category = 'SME'`
  - `category=ALL` → `WHERE category IN ('MAINBOARD', 'SME')`
  - *Invariant:* Records where `category = 'UNKNOWN'` are strictly quarantined and never returned.
- **Cache-Control:** `public, s-maxage=300, stale-while-revalidate=600`.

#### `GET /api/ipos/[slug]`
- **Description:** Retrieve comprehensive details for a specific IPO (Mainboard or SME), including category flag, price band, lot size, issue breakdown, quotas, and dates.
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": {
      "companyName": "Sample Tech Limited",
      "symbol": "SAMPLE",
      "slug": "sample-tech-limited",
      "category": "MAINBOARD", // or "SME"
      "status": "OPEN",
      "priceBandMin": 450,
      "priceBandMax": 475,
      "lotSize": 30,
      "minInvestment": 14250,
      "dates": { ... }
    }
  }
  ```
- **Cache-Control:** `public, s-maxage=300, stale-while-revalidate=600`.

#### `GET /api/ipos/[slug]/gmp`
- **Description:** Retrieve historical GMP data points, estimated listing price, and timestamp metadata.
- **Cache-Control:** `public, s-maxage=120, stale-while-revalidate=600`.

#### `GET /api/ipos/[slug]/subscription`
- **Description:** Retrieve current and time-series subscription multiples (QIB, sNII, bNII, Retail, Total).
- **Cache-Control:** `public, s-maxage=120, stale-while-revalidate=600`.

#### `GET /api/ipos/[slug]/listing`
- **Description:** Retrieve listing outcome, listing gain/loss percentage, and GMP vs. actual listing comparison.
- **Cache-Control:** `public, s-maxage=600, stale-while-revalidate=3600`.

---

### 3.2 User & Personalization Routes

#### `POST /api/watchlist`
- **Description:** Add or remove an IPO from the user's watchlist.
- **Auth:** User session.
- **Cache-Control:** `no-store, max-age=0`.

---

### 3.3 Ephemeral Allotment Proxy Route (Deferred Module)

#### `POST /api/allotment/check`
- **Description:** Stateless allotment status lookup.
- **Privacy Constraints:**
  - **ZERO DATABASE STORAGE:** No records written to Neon PostgreSQL.
  - **TRANSIENT RAM ONLY:** PAN parsed in memory, dispatched to registrar, response formatted, memory released.
  - **LOG SANITIZATION:** PAN is masked in all server traces.
- **Cache-Control:** `no-store, max-age=0`.

---

### 3.4 Ingestion & Maintenance Endpoints

#### `POST /api/ingest/trigger`
- **Description:** Internal webhook to trigger provider ingestion routines.
- **Authorization:** Bearer token matching server-side `CRON_SECRET`.
- **Request Body (Optional):**
  ```json
  {
    "providerId": "upstox",
    "category": "ALL", // 'MAINBOARD' | 'SME' | 'ALL'
    "target": "subscription"
  }
  ```
- **Response:** Execution summary with processed count and ingestion status.

---

## 4. Secret & API Key Security Policies

1. **Server-Side Isolation:** All external API tokens are accessed strictly on the server runtime.
2. **No Client Leakage:** No secret will ever be exposed through `NEXT_PUBLIC_` environment variables or serialized into page HTML.
3. **No Key Logging:** Ingestion logs record timestamps, status codes, and record counts; API keys are never logged.
