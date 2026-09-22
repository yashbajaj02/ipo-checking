# System Architecture: Indian IPO Research & Tracking Platform

## 1. System Architecture & Topology

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER (Browser)                             │
│                                                                                 │
│   Next.js 15 Client Components • Tailwind CSS • Global IPO Type Filter           │
│   (User-selectable: Mainboard [Default] | SME | All)                            │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ HTTPS / JSON API / Server Actions
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        VERCEL SERVERLESS LAYER (Free Tier)                      │
│                                                                                 │
│  ┌─────────────────────────────┐           ┌─────────────────────────────────┐  │
│  │   React Server Components   │           │    Data Ingestion Layer         │  │
│  │   & ISR Page Cache (2-5m)   │           │    (Adapters & Normalizers)     │  │
│  └─────────────────────────────┘           └─────────────────────────────────┘  │
│                 │                                           │                   │
│                 │  Reads Cached Data                        │  Writes Ingested  │
│                 ▼                                           ▼  Data & Audit     │
└─────────────────┼───────────────────────────────────────────┼───────────────────┘
                  │                                           │
                  │   HTTP Serverless Driver (@neondatabase/serverless)
                  ▼                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       NEON POSTGRESQL DATABASE (Free Tier)                      │
│                                                                                 │
│  Relational Storage • Drizzle ORM • Storage <= 0.5 GiB • Zero PAN Table        │
│  Category Support: MAINBOARD | SME | UNKNOWN (Quarantined)                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Practical MVP Data Refresh & Caching Strategy

### 2.1 Resolving Ingestion Frequency vs. Cache Duration

```
External APIs (Upstox, IPO Guru, IPO Alerts)
         │
         │  [Scheduled Ingestion: 2-4 runs/day OR Protected Manual Trigger]
         ▼
Neon PostgreSQL Database (Single Source of Truth)
         │
         │  [Database Read on Cache Expiry - Dynamic Filter: category=MAINBOARD | SME | ALL]
         ▼
Next.js Edge / CDN Cache (ISR: revalidate = 120s - 300s, SWR)
         │
         │  [Instant Delivery: 0ms DB Latency, 0 External API Hits]
         ▼
End Users (~500 Concurrent Readers)
```

- **Data Refresh Frequency (External Provider → Backend → Neon DB):**
  - External APIs are polled **2 to 4 times per trading day** (e.g., 09:30 AM, 01:00 PM, 04:30 PM, 06:00 PM IST) for both Mainboard and SME issues.
  - To handle breaking announcements or live allotment releases, an **explicit manual refresh path** is exposed via a protected server route (`POST /api/ingest/trigger` authenticated with `CRON_SECRET`).
  - **Zero Direct Client Ingestion:** User visits NEVER trigger external API calls.
- **Page & API Cache Duration (Neon DB → Next.js Edge/Browser):**
  - Dashboard & IPO listings use Incremental Static Regeneration (ISR) with `revalidate = 300` (5 minutes).
  - GMP and Subscription endpoints return HTTP headers `Cache-Control: public, s-maxage=120, stale-while-revalidate=600`.
  - The Edge CDN serves cached snapshots instantly to users without repeatedly querying the Neon database.
- **Realistic Presentation (No False Real-Time Promises):**
  - Data is presented as **"Periodic Market Snapshots"**.
  - Every UI card displays explicit metadata: `Last updated: DD/MM/YYYY HH:mm IST (Source: [Provider])`.

---

## 3. Board Classification & Ingestion Triage

### 3.1 Ingestion Pipeline
```
External Provider
       │
       ▼
Provider Adapter
       │
       ▼
Validate Category Metadata
       │
       ├─► MAINBOARD ──────┐
       │                   ▼
       ├─► SME ──────────► [ Normalize & Validate ] ──► Store in Neon PostgreSQL
       │
       └─► UNKNOWN ──────► [ Quarantine / Staging ] (NEVER published to public feeds)
```

### 3.2 Triage Rules
1. **Explicit Metadata Requirement:**
   - `MAINBOARD` → Ingested and published. Displayed when filter is `Mainboard` or `All`.
   - `SME` (BSE SME / NSE Emerge) → Ingested and published. Displayed when filter is `SME` or `All`. Carries prominent visual SME badges.
   - `UNKNOWN / UNVERIFIED` → Quarantined in staging; **never published** to public user views until explicitly verified.
2. **Strict Heuristic Prohibition:**
   - **Board classification must NEVER be inferred from issue size, lot size, or minimum investment thresholds.** Both small Mainboard issues and large SME issues exist; classification must rely solely on verified exchange metadata.

---

## 4. Multi-Provider Ingestion Architecture

### 4.1 Provider Adapter Pattern
Every external data source implements a uniform TypeScript contract:
- `fetchIpos()`: Fetches official issue details, price bands, lot sizes, and board category metadata.
- `fetchSubscriptionData()`: Fetches bidding breakdown (QIB, NII, Retail, Total).
- `fetchGmpData()`: Fetches non-official GMP quotes with provenance timestamps.

### 4.2 Field-Level Source Policy (MVP Evaluation Matrix)

| Field Category | Primary Provider | Fallback Provider | Nature of Data | Refresh Priority |
|---|---|---|---|---|
| **Company Details & Symbol** | *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Official | Low (Once on creation) |
| **Board Category (Mainboard/SME)**| *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Official (BSE/NSE) | Critical (On creation) |
| **Price Band & Lot Size** | *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Official | Low (Updated upon RHP filing) |
| **Issue Size (Fresh + OFS)** | *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Official | Low (Updated upon RHP filing) |
| **Important IPO Dates** | *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Official | Medium (Checked daily) |
| **Live Subscription** | *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Official (BSE/NSE) | High (2-4x daily during market) |
| **GMP (Amount & %)** | *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Non-Official (Market sentiment) | High (2-4x daily snapshots) |
| **Listing Price & Results** | *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Official (BSE/NSE) | One-time (On listing day 10:00 AM) |

---

## 5. PAN Privacy & Key Management Architecture

### 5.1 Zero-Retention Database Guarantee
- **No Database Record:** PostgreSQL contains **no `user_pans` table**. Plaintext PANs are never written to disk, server memory caches, or backend session stores.
- **Ephemeral Allotment Proxy:** During an allotment check, the client submits the PAN in the request payload. The Next.js API route holds it strictly in transient execution memory to proxy the query to registrar APIs, returns the result, and immediately deallocates the buffer.
- **Log & Trace Sanitization:** PAN patterns (`/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`) are stripped and masked from all console logs, server traces, and client analytics.

### 5.2 Client-Side Security Design (Web Browser)

> [!IMPORTANT]
> **Deferred Implementation:** Client-side PAN vault storage is classified as a **separate security-sensitive module requiring dedicated cryptographic design sign-off** before any application code is written.

When implemented, the client security architecture must adhere to:
1. **Key Derivation:** Web Crypto API `PBKDF2` with `SHA-256`, >= 100,000 iterations, using a local user PIN/passkey and a unique random cryptographic salt.
2. **Key Storage & Lifetime:** The derived `AES-GCM` 256-bit encryption key must **NEVER be persisted** to `localStorage` or `IndexedDB`. It exists only in transient JavaScript execution memory and is discarded on tab closure, navigation, or session timeout.
3. **Storage Clearing:** Clearing browser cookies/storage immediately destroys all local encrypted blobs.
4. **Device Isolation:** Zero server synchronization means saved profiles remain strictly local to that specific browser.
5. **No Recovery by Design:** In this zero-knowledge privacy model, **recovery is intentionally impossible**.

---

## 6. API Key & Secret Security

- **Server-Side Exclusivity:** All third-party credentials (`UPSTOX_API_KEY`, `IPO_GURU_KEY`, `CRON_SECRET`) are loaded strictly into server runtime environments.
- **No Client Bundling:** Third-party credentials must **never** use the `NEXT_PUBLIC_` prefix.
- **Git Hygiene:** No `.env` files containing secrets are committed. `.env.example` contains placeholders only.

---

## 7. Free-Tier Operational Constraints (₹0/Month)

The platform is designed to operate on free tiers:
- **Hosting:** Vercel Hobby Plan.
- **Database:** Neon PostgreSQL Free Tier (0.5 GiB storage, serverless compute hours).
- **Dependencies & Limits:** Continued ₹0/month operation depends on remaining within Neon storage limits, Vercel edge execution allowances, and provider API quotas for the ~500-user MVP.
