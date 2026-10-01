# Project Specification: Indian IPO Research & Tracking Platform

See the complete specification at [`docs/PROJECT_SPEC.md`](./docs/PROJECT_SPEC.md).

### Core Highlights
- **Scope:** Supports **BOTH Mainboard and SME IPOs** with a user-selectable filter (`Mainboard` default, `SME`, `All`).
- **Classification:** Category derived strictly from explicit provider/exchange metadata. Never inferred from issue size or lot size.
- **Architecture:** Multi-provider ingestion via server-side adapters; client reads from Neon PostgreSQL.
- **Privacy:** Zero database retention for PANs; ephemeral allotment lookups; PAN vault marked for separate security review.
- **Cost Target:** ₹0/month MVP relying on Vercel and Neon free tiers (subject to documented usage limits).
- **Refresh Strategy:** Decoupled scheduled ingestion (2-4x daily) vs. Edge SWR caching (2-5 minutes).
