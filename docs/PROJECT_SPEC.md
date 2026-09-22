# Project Specification: Indian IPO Research & Tracking Platform

## 1. Project Context & Objectives

- **Project Status:** Research & Prototyping Stage
- **App Name & URL:** To be finalized prior to public launch
- **Target Audience:** Initial capacity planned for approximately **500 active users** with architecture scalable beyond.
- **Cost Target:** **₹0/month** initial operational expenditure by remaining strictly within cloud free tiers (Neon PostgreSQL, Vercel Hobby Tier).
  - *Operational Caveat:* The ₹0/month target is an active architectural constraint for the MVP. It depends on free-tier compute/storage limits, API provider free quotas, actual user traffic, database storage usage, and notification volume. It is not an indefinite commercial guarantee.
- **Product Scope & Category Model:** **Supports BOTH Mainboard and SME IPOs via a User-Selectable Filter**.
  - **Default View:** `Mainboard` is the default filter for new users and the primary initial experience.
  - **User-Selectable Options:** `Mainboard`, `SME`, `All`.
  - **Unified Experience:** Both Mainboard and SME issues share the same unified page templates and routes (`/` and `/ipos/[slug]`); no separate duplicated page trees are built.

---

## 2. Board Classification & Filtering Policy

To prevent misclassification, board eligibility is determined strictly by explicit exchange or provider metadata:

- **Classification Rules:**
  - `MAINBOARD` → Eligible for ingestion and publishing. Displayed when filter is `Mainboard` (default) or `All`.
  - `SME` → Eligible for ingestion and publishing. Displayed when filter is `SME` or `All`. SME issues carry an explicit amber visual badge and lot-size notice.
  - `UNKNOWN / UNVERIFIED` → Quarantined in staging; **must NEVER be shown in public IPO lists** until manually or programmatically verified against official exchange circulars.
- **Strict Heuristic Prohibition:** **NEVER infer Mainboard vs. SME from issue size, lot size, or minimum investment amount.** Classification must be based exclusively on explicit provider or exchange series flags (e.g., `series: "EQ"` vs `series: "SM"`, or explicit exchange board tags).

---

## 3. Core Product Features (24 Key Capabilities)

### 3.1 IPO Discovery & Lifecycle
1. **Upcoming IPOs:** Tracking upcoming Mainboard and SME issues with filed DRHP/RHP or exchange-approved dates.
2. **Open / Ongoing IPOs:** Real-time dashboard of issues currently open for bidding, filterable by IPO Type (`Mainboard`, `SME`, `All`).
3. **Closed / Recently Listed IPOs:** Historical tracking of completed issues and recent listings on BSE/NSE.
4. **IPO Detail Page:** Consolidated profile including company background, issue breakdown, quotas, and regulatory documents.
5. **IPO Price Band:** Clear display of floor price, cap price, and cut-off price option.
6. **Lot Size:** Minimum bid quantity and retail/HNI lot multiples (with high-visibility indicators for SME minimum lot sizes).
7. **Minimum Investment Calculation:** Calculated strictly as `price_band_max * lot_size`.
8. **IPO Issue Size:** Total issue amount (in ₹ Crores) with granular breakdown into Fresh Issue vs. Offer for Sale (OFS).
9. **Important IPO Dates:** Key milestones:
   - Anchor Bidding Date
   - Issue Open & Close Dates
   - Basis of Allotment Date
   - Initiation of Refunds / UPI Mandate Unblocking Date
   - Credit of Shares to Demat Account Date
   - Listing Date on BSE/NSE

### 3.2 Grey Market Premium (GMP) Analytics
10. **Grey Market Premium (GMP):** Absolute ₹ premium over the issue cap price.
    - *Provenance Notice:* GMP is treated strictly as **non-official, unregulated market information**. Every GMP entry must display its source provider, source timestamp, and fetched timestamp.
11. **GMP Percentage:** Calculated percentage return estimate over the upper price band.
12. **Date-wise GMP History:** Time-series tracking of GMP fluctuations from announcement to listing.
13. **GMP Trend Visualization:** Interactive charts displaying GMP movement alongside key market dates.

### 3.3 Subscription Analytics
14. **QIB Subscription:** Qualified Institutional Buyers subscription multiple (x times).
15. **NII Subscription:** Non-Institutional Investors subscription multiple, with sub-categories:
    - Small NII (`sNII`: bids between ₹2 Lakhs and ₹10 Lakhs)
    - Big NII (`bNII`: bids above ₹10 Lakhs)
16. **Retail Subscription:** Retail Individual Investors (RII) subscription multiple (bids up to ₹2 Lakhs).
17. **Total Subscription:** Cumulative overall subscription multiple across all eligible investor buckets.
18. **Date/Time-Based Subscription History:** Time-series snapshots recording subscription momentum across bidding days (10:00 AM to 5:00 PM IST).

### 3.4 Listing Performance & Accuracy Tracking
19. **Listing Result:** Official opening listing price, listing date, and opening gain/loss percentage relative to issue price.
20. **GMP vs. Actual Listing Comparison:** Post-listing accuracy scorecard comparing the final estimated GMP against the actual market opening gain/loss.

### 3.5 Personalization & Future Roadmap (Post-MVP)
21. **IPO Watchlist:** User-selected IPOs for rapid tracking and filtering.
22. **Notifications (Deferred):** Push/Email alerts for bidding opening, subscription milestones, GMP spikes, and allotment publication.
23. **IPO Allotment Checking (Deferred):** Stateless proxy lookups against registrar gateways (LinkIntime, KFintech, Bigshare).
24. **Saved PANs (Deferred - Security Sensitive):** Client-side encrypted local storage for rapid allotment checking without repeated entry.

---

## 4. Multi-Provider Data Ingestion & Field Ownership Policy

To ensure data integrity, the system utilizes a Provider Adapter pattern supporting both Mainboard and SME IPOs. External providers currently being evaluated include:
- **Upstox IPO API**
- **IPO Guru**
- **IPO Alerts**
- *Other legitimate sources as required*

No single provider is assumed to have full coverage or 100% uptime. Conflicting fields are never blindly overwritten.

### 4.1 Ingestion Flow
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

### 4.2 Field-Level Source Policy (MVP Evaluation Matrix)

| Field Category | Primary Provider | Fallback Provider | Nature of Data | Refresh Priority |
|---|---|---|---|---|
| **Company Details & Symbol** | *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Official | Low (Once on creation) |
| **Board Category (Mainboard/SME)**| *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Official (BSE/NSE) | Critical (On creation) |
| **Price Band & Lot Size** | *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Official | Low (Updated upon RHP filing) |
| **Issue Size (Fresh + OFS)** | *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Official | Low (Updated upon RHP filing) |
| **Important IPO Dates** | *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Official | Medium (Checked daily) |
| **Live Subscription** | *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Official (BSE/NSE) | High (During market hours: 10 AM - 5 PM IST) |
| **GMP (Amount & %)** | *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Non-Official (Market sentiment) | High (Periodic snapshots 2-4x daily) |
| **Listing Price & Results** | *TO BE CONFIRMED AFTER API TESTING* | *TO BE CONFIRMED AFTER API TESTING* | Official (BSE/NSE) | One-time (On listing day 10:00 AM IST) |

---

## 5. PAN Privacy & Security Architecture (Deferred Module)

The platform adheres to an uncompromising, privacy-first zero-retention architecture.

### 5.1 Zero-Retention Guarantees
- **No Database Persistence:** There is **NO `user_pans` table** in the PostgreSQL database.
- **No Log Leaks:** Plaintext PANs are strictly filtered and masked from server logs, analytics events, and error stack traces.
- **Ephemeral Lookup:** Allotment checks are handled via transient in-memory requests directly proxied to registrars and immediately purged.

### 5.2 Client-Side Security & Key Management Decisions

> [!CAUTION]
> **Implementation Status:** PAN vault implementation is classified as a **separate security-sensitive module requiring dedicated design sign-off and cryptographic review** before writing any code.

The following security principles govern any future client-side vault implementation:
1. **Key Creation & Derivation:** Keys must be derived on the client device using the Web Crypto API (`PBKDF2` with `SHA-256`, >= 100,000 iterations, with a unique cryptographically random salt).
2. **Key Storage & Lifetime:** The derived `AES-GCM` encryption key must **NEVER** be persisted to disk (`localStorage` or `IndexedDB`). It must reside exclusively in transient JavaScript memory and be immediately garbage-collected upon session timeout or tab closure.
3. **Storage Cleared Event:** If the user clears browser cookies/storage, all encrypted local records are permanently wiped.
4. **Device Switching:** Because zero data is stored or synchronized on our servers, saved PANs will never sync across devices. Users must re-enter PANs on each device.
5. **Forgotten Credentials:** In this privacy-first zero-knowledge architecture, **recovery is intentionally impossible by design**. There is no backend reset, recovery email, or master key escrow. If the local unlock credential is lost, the local encrypted data must be reset.

---

## 6. API Key & Secret Management Policy

- **Strict Server-Side Isolation:** All external provider credentials (`UPSTOX_API_KEY`, `IPO_GURU_KEY`, etc.) and `CRON_SECRET` must reside exclusively in server-side environment variables.
- **No Client Exposure:** Secrets must **NEVER** be prefixed with `NEXT_PUBLIC_` or bundled into client-side JavaScript.
- **Version Control Safety:** Actual credentials must never be committed to Git. `.env.local` is ignored by `.gitignore`. `.env.example` contains placeholders only.
- **Telemetry Redaction:** Provider secrets and auth tokens must be redacted from application traces and error reporting tools.

---

## 7. Data Refresh vs. Cache Duration Strategy

- **Data Ingestion Frequency (Backend → Neon DB):**
  - **Scheduled Ingestion:** 2 to 4 runs per business day (e.g., 09:30 AM, 01:00 PM, 04:30 PM, 06:00 PM IST) for both Mainboard and SME issues.
  - **Manual / Emergency Ingestion:** Protected endpoint (`/api/ingest/trigger` with bearer token) for ad-hoc refreshes when breaking announcements or allotment results drop.
- **Page & API Cache Duration (Neon DB → Next.js Edge/Browser):**
  - Next.js ISR (Incremental Static Regeneration) serves cached pages from edge memory (`s-maxage=120` to `300`, `stale-while-revalidate=600`).
  - Read queries hit the Edge cache and Neon database, **NEVER external APIs**.
  - GMP and subscription metrics are explicitly labeled with their snapshot timestamps (`Last updated: DD/MM/YYYY HH:mm IST`) rather than misleading users with false promises of real-time tick feeds.
