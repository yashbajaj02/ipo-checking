# Architecture Decision Log (DECISIONS.md)

This document records the foundational architectural decisions for the Indian IPO research and tracking platform.

---

### ADR-001 (Updated): User-Selectable IPO Types (Mainboard Default, SME and All as Explicit Filters)
- **Status:** Locked (Supersedes previous Mainboard-Only policy)
- **Context:** While Mainboard issues represent the primary interest for most retail investors due to lower liquidity risk, investors also actively track SME issues (BSE SME / NSE Emerge). Excluding SME issues permanently prevents comprehensive market coverage.
- **Decision:** IPO Type is **user-selectable**.
  - `Mainboard` is the default filter for new users and the primary initial experience.
  - `SME` is available as an explicit user-selected filter.
  - `All` displays both Mainboard and SME IPOs.
  - `UNKNOWN / UNVERIFIED` records must never be shown in public IPO lists.
- **Consequences:** Ingestion adapters accept both `MAINBOARD` and `SME` records when explicit category metadata is present. Public listing APIs support `category=MAINBOARD`, `category=SME`, and `category=ALL` (defaulting to `MAINBOARD`). The UI includes a global IPO Type segmented filter.

---

### ADR-002: Neon PostgreSQL Selected as Primary Database (Instead of Supabase)
- **Status:** Locked
- **Context:** The project requires a relational PostgreSQL database on a free tier. Existing Supabase free projects are already occupied.
- **Decision:** Use Neon Serverless PostgreSQL (`@neondatabase/serverless` with Drizzle ORM).
- **Consequences:** Leverages 0.5 GiB free storage, serverless connection pooling over HTTP/WebSockets, and fast branching without recurring costs.

---

### ADR-003: Vercel as Initial Hosting Target
- **Status:** Locked
- **Context:** The MVP must stay within ₹0/month operating cost with minimal operational maintenance.
- **Decision:** Host the Next.js application on the Vercel Hobby Free Tier.
- **Consequences:** Seamless Next.js App Router deployment, Edge CDN caching, and basic cron execution without dedicated server infrastructure.

---

### ADR-004: Zero Database Retention for User PAN Numbers
- **Status:** Locked
- **Context:** Storing Permanent Account Numbers (PANs) on the backend creates severe privacy, compliance, and breach liability.
- **Decision:** There will be **NO `user_pans` table** in PostgreSQL. Plaintext PANs are never stored in the database, server caches, analytics, or application logs. Allotment checks are strictly ephemeral in-memory proxy lookups.
- **Consequences:** Zero risk of centralized database PAN breaches.

---

### ADR-005: Multi-Provider Data Ingestion Architecture
- **Status:** Locked
- **Context:** No single external API provides complete, reliable, and free data across price bands, subscription figures, and non-official GMP metrics.
- **Decision:** Use a Provider Adapter pattern supporting multiple sources (e.g., Upstox, IPO Guru, IPO Alerts) with clear fallback precedence.
- **Consequences:** Ingestion is decoupled from any single provider API format. If one provider changes their schema or experiences downtime, fallback sources can provide continuity.

---

### ADR-006: Backend-Only External API Calls
- **Status:** Locked
- **Context:** Calling external provider APIs directly from client browsers exposes API keys, causes CORS issues, and exhausts provider rate limits.
- **Decision:** Clients NEVER call external providers directly. All external fetches occur exclusively within backend ingestion workers or route handlers.
- **Consequences:** External API keys remain securely guarded in server environment variables. Users read normalized data strictly from our backend/database.

---

### ADR-007: Free-Tier-First MVP Strategy (₹0/Month Goal)
- **Status:** Locked
- **Context:** Initial development target is ~500 users with zero initial operating revenue.
- **Decision:** Architect the platform to operate within the free tiers of Vercel, Neon PostgreSQL, and provider free allowances.
- **Consequences:** The ₹0/month target is an active operational goal for MVP, dependent on cloud limits, database size, and provider quotas. It is not an indefinite guarantee if traffic surges.

---

### ADR-008: No Issue-Size Heuristic for Mainboard vs. SME Classification
- **Status:** Locked
- **Context:** Inferring whether an IPO is Mainboard vs. SME based solely on issue size (e.g., `< ₹250 Cr`), lot size, or investment amount is error-prone because large SME IPOs and small Mainboard issues exist.
- **Decision:** Board classification MUST be based on an explicit category/exchange series field provided by the source (e.g., `series === 'EQ'` vs `series === 'SM'`, or explicit exchange board tags).
  - `MAINBOARD` → eligible for ingestion and publishing.
  - `SME` → eligible for ingestion and publishing under SME/All filters.
  - `UNKNOWN / UNVERIFIED` → quarantined in staging; do not publish until manually or programmatically verified.
- **Consequences:** Eliminates false classifications and prevents accidental miscategorization.

---

### ADR-009: Client PAN Vault Requires Separate Security Review Before Implementation
- **Status:** Locked
- **Context:** Client-side encryption key management (derivation, session lifetime, storage isolation, loss recovery) involves nuanced browser security considerations.
- **Decision:** Do NOT implement PAN vault storage in the initial scaffold. Mark the PAN vault as a separate security-sensitive module that requires explicit design sign-off and cryptographic review before implementation.
- **Consequences:** Prevents shipping half-baked client cryptographic implementations that might give users a false sense of security.
