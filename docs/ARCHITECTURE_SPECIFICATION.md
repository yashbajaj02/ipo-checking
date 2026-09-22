# System Architecture & Technical Specification: Indian IPO Platform

## 1. Project Overview & Operational Constraints

- **Target Audience:** ~500 active users initially (scalable architecture).
- **Cost Constraint:** Operational target of **₹0/month** leveraging free cloud tiers (Neon PostgreSQL, Vercel Hobby Tier).
  - *Dependencies:* The ₹0/month target depends on free-tier compute limits, Neon 0.5 GiB storage, API provider free quotas, actual user traffic, and notification volume.
- **Product Scope & Category Support:** **Supports BOTH Mainboard and SME IPOs**.
  - User-selectable filter: `Mainboard` (default view for new users), `SME`, and `All`.
  - Both categories share unified UI templates and endpoints; `UNKNOWN` is quarantined and never published.
- **Data Integrity:** Multi-provider ingestion with deterministic fallback and field-level provenance. Non-official data (GMP) flagged with source, timestamp, and snapshot indicators.
- **Privacy Standard:** Zero-retention PAN architecture. No PAN numbers stored in PostgreSQL.

---

## 2. Technology Stack & Infrastructure

```
┌────────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Free Tier)                             │
│                                                                        │
│  ┌───────────────────────────┐     ┌────────────────────────────────┐  │
│  │   Next.js 15 App Router   │     │    Next.js Server Actions /    │  │
│  │   (React Server Comps,    │ ─── │    Route Handlers & Ingestion  │  │
│  │    Tailwind CSS, TS)      │     │    (Scheduled & Manual Triggers│  │
│  │    [Mainboard / SME / All]│     │                                │  │
│  └───────────────────────────┘     └────────────────────────────────┘  │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │ Database Queries (Drizzle / @neondatabase/serverless)
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NEON POSTGRESQL (Free Tier)                     │
│                                                                        │
│   • Serverless Postgres Pool  • Branching  • Storage <= 0.5 GiB        │
│   • Category: MAINBOARD | SME | UNKNOWN (Quarantined)                  │
│   • Zero PAN Storage                                                   │
└────────────────────────────────────────────────────────────────────────┘
```

| Layer | Selected Tech | Rationale & Free Tier Compliance |
|---|---|---|
| **Frontend Framework** | Next.js 15 (App Router, TypeScript) | SSR/ISR rendering for fast performance, SEO optimization, easy Vercel deployment. |
| **Styling & UI** | Tailwind CSS + Lucide Icons | Zero runtime cost, modular, accessible design system. |
| **Backend & Ingestion** | Next.js API Route Handlers / Server Actions | Unified deployment on Vercel without separate backend servers. |
| **Database** | Neon PostgreSQL (Free Tier) | 0.5 GiB storage, serverless driver (`@neondatabase/serverless`), 100% relational support. |
| **ORM / Query Builder** | Drizzle ORM | Ultra-lightweight, zero bundle overhead, type-safe SQL, native Neon driver support. |
| **Hosting & Scheduling** | Vercel Hobby Plan + Scheduled / Webhook Triggers | Free hosting, automatic SSL, CDN edge caching, decoupled ingestion. |

---

## 3. Data Architecture & Ingestion Pipeline

### 3.1 Data Flow Architecture

```
External APIs (Upstox, IPO Guru, IPO Alerts)
                          │
                          ▼
            [ Provider Adapter Interface ]
                          │
                          ▼
            [ Validate Category Metadata ]
             ├─► MAINBOARD ──────┐
             ├─► SME ──────────► ▼
             │     [ Validation & Normalization Layer ]
             │             (Zod Schemas)
             │                   │
             │                   ▼
             │     [ Deterministic Field Fallback ]
             │                   │
             │                   ▼
             │         [ Neon PostgreSQL DB ]
             │
             └─► UNKNOWN ──────► [ Quarantine / Staging ] (NEVER published)
```

### 3.2 Provider Adapter Pattern
Every data source implements a unified TypeScript interface:

```typescript
export interface ExternalIpoProvider {
  providerId: string; // 'upstox', 'ipo_guru', 'ipo_alerts'
  priorityRank: number; // 1 = highest priority
  fetchIpos(): Promise<NormalizedIpoPayload[]>;
  fetchGmpData(): Promise<NormalizedGmpPayload[]>;
  fetchSubscriptionData(): Promise<NormalizedSubscriptionPayload[]>;
}
```

### 3.3 Board Classification & Triage Rules
Classification must be determined strictly from explicit provider/exchange category fields:
- `MAINBOARD` → Eligible for ingestion and publishing (shown under `Mainboard` and `All` filters).
- `SME` (BSE SME / NSE Emerge) → Eligible for ingestion and publishing (shown under `SME` and `All` filters). Carries explicit SME visual treatment.
- `UNKNOWN / UNVERIFIED` → Quarantined in staging; **must NEVER be shown in public IPO lists** until verified.
- **Rule:** **NEVER infer Mainboard vs. SME from issue size, lot size, or investment amount.**

### 3.4 Field-Level Source Policy (MVP Evaluation Matrix)

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

## 4. Relational Database Schema (Neon PostgreSQL)

### 4.1 SQL DDL Schema Definition

```sql
-- Enums
CREATE TYPE ipo_status AS ENUM ('UPCOMING', 'OPEN', 'CLOSED', 'LISTED');
CREATE TYPE ipo_category AS ENUM ('MAINBOARD', 'SME', 'UNKNOWN');
CREATE TYPE verification_status AS ENUM ('UNVERIFIED', 'PROVISIONAL', 'VERIFIED');

-- Core Users & Profiles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IPO Core Entity (Queries filter by category = 'MAINBOARD' [default], 'SME', or IN ('MAINBOARD', 'SME') for 'ALL')
-- UNKNOWN is quarantined and never returned in public queries
CREATE TABLE ipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50),
    slug VARCHAR(255) UNIQUE NOT NULL,
    category ipo_category NOT NULL DEFAULT 'UNKNOWN',
    status ipo_status NOT NULL DEFAULT 'UPCOMING',
    price_band_min NUMERIC(10, 2),
    price_band_max NUMERIC(10, 2),
    lot_size INT,
    min_investment NUMERIC(12, 2) GENERATED ALWAYS AS (price_band_max * lot_size) STORED,
    issue_size_crores NUMERIC(10, 2),
    fresh_issue_crores NUMERIC(10, 2),
    ofs_crores NUMERIC(10, 2),
    face_value NUMERIC(6, 2),
    retail_quota_percent NUMERIC(5, 2),
    qib_quota_percent NUMERIC(5, 2),
    nii_quota_percent NUMERIC(5, 2),
    drhp_url TEXT,
    rhp_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IPO Key Dates
CREATE TABLE ipo_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
    offer_start_date DATE,
    offer_end_date DATE,
    allotment_date DATE,
    unblocking_date DATE,
    credit_to_demat_date DATE,
    listing_date DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Data Sources Registry
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    priority_rank INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grey Market Premium (GMP) History
CREATE TABLE ipo_gmp_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
    data_source_id UUID REFERENCES data_sources(id),
    gmp_amount NUMERIC(10, 2) NOT NULL,
    gmp_percentage NUMERIC(6, 2) NOT NULL,
    estimated_listing_price NUMERIC(10, 2),
    source_timestamp TIMESTAMPTZ NOT NULL,
    fetched_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verification_status verification_status NOT NULL DEFAULT 'UNVERIFIED',
    confidence_score NUMERIC(3, 2) DEFAULT 1.00
);

-- Subscription History (QIB, NII, Retail, Total)
CREATE TABLE ipo_subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
    data_source_id UUID REFERENCES data_sources(id),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    qib_subscription NUMERIC(8, 2),
    nii_subscription NUMERIC(8, 2),
    b_nii_subscription NUMERIC(8, 2),
    s_nii_subscription NUMERIC(8, 2),
    retail_subscription NUMERIC(8, 2),
    employee_subscription NUMERIC(8, 2),
    shareholder_subscription NUMERIC(8, 2),
    total_subscription NUMERIC(8, 2) NOT NULL,
    fetched_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Listing Results & Comparison
CREATE TABLE ipo_listing_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipo_id UUID NOT NULL UNIQUE REFERENCES ipos(id) ON DELETE CASCADE,
    issue_price NUMERIC(10, 2) NOT NULL,
    listing_price NUMERIC(10, 2) NOT NULL,
    listing_gain_loss_amount NUMERIC(10, 2) GENERATED ALWAYS AS (listing_price - issue_price) STORED,
    listing_gain_loss_percent NUMERIC(6, 2) GENERATED ALWAYS AS (((listing_price - issue_price) / issue_price) * 100) STORED,
    final_gmp_before_listing NUMERIC(10, 2),
    gmp_vs_actual_variance NUMERIC(6, 2),
    listed_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Watchlists
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, ipo_id)
);

-- Notification Subscriptions
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ipo_id UUID REFERENCES ipos(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'WEB_PUSH',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ingestion Logs & Raw Audit
CREATE TABLE ingestion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID REFERENCES data_sources(id),
    status VARCHAR(20) NOT NULL,
    records_processed INT DEFAULT 0,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_ipos_status_category ON ipos(status, category);
CREATE INDEX idx_gmp_ipo_timestamp ON ipo_gmp_history(ipo_id, source_timestamp DESC);
CREATE INDEX idx_sub_ipo_timestamp ON ipo_subscription_history(ipo_id, snapshot_timestamp DESC);
```

---

## 5. PAN Privacy & Security Design Decisions

### 5.1 Zero-Retention Database Guarantee
- **No Database Record:** PostgreSQL contains **no `user_pans` table**. Plaintext PANs are never written to disk, server memory caches, or backend session stores.
- **Ephemeral Allotment Proxy:** During an allotment check, the client submits the PAN in the request payload. The Next.js API route holds it strictly in transient execution memory to proxy the query to registrar APIs, returns the result, and immediately deallocates the buffer.
- **Log & Trace Sanitization:** PAN patterns are stripped and masked from all console logs, server traces, and client analytics.

---

## 6. Practical MVP Refresh vs. Cache Duration Strategy

- **Ingestion Frequency:**
  - Scheduled Ingestion: 2 to 4 runs/day during market hours (09:30, 13:00, 16:30, 18:00 IST) for both Mainboard and SME issues.
  - Explicit manual refresh route (`POST /api/ingest/trigger` with bearer token) for breaking events.
  - External APIs are never called by client page views.
- **Cache Duration:**
  - Public dashboard and IPO listings: ISR `revalidate = 300` (5 minutes), parameterized by `category`.
  - GMP & subscription API endpoints: `s-maxage=120, stale-while-revalidate=600`.
- **Presentation Rule:**
  - GMP and subscription figures are presented as timestamped snapshots, not real-time tick streams.
