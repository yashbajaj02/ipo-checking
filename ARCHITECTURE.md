# System Architecture: Indian IPO Research & Tracking Platform

See the complete system architecture at [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

### Core Highlights
- **Topology:** Next.js 15 App Router on Vercel Hobby + Neon Serverless PostgreSQL (`@neondatabase/serverless` + Drizzle ORM).
- **Category Model:** Supports **BOTH Mainboard and SME** with a user-selectable global filter (`Mainboard` default, `SME`, `All`).
- **Ingestion Pipeline:** External Provider → Adapter → Validate Category → `MAINBOARD` & `SME` accepted, `UNKNOWN` quarantined → Normalize → Neon DB.
- **Refresh & Caching:** Decoupled scheduled ingestion (2-4x daily) and manual triggers from client Edge/ISR caching (2-5 minutes). Snapshot presentation with timestamps.
- **PAN Security:** Zero database retention; ephemeral memory proxy; PAN vault deferred for dedicated cryptographic review.
- **API Security:** Secrets strictly server-side; no `NEXT_PUBLIC_` on API keys.
