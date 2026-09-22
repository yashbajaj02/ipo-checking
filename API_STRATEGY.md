# API Strategy & Route Handlers

See the complete API strategy documentation at [`docs/API_STRATEGY.md`](file:///home/yash-bajaj/Downloads/project/ipo%20checking/docs/API_STRATEGY.md).

### Core Highlights
- **Ingestion Decoupling:** Client browsers NEVER query external APIs. All external ingestion is backend-only.
- **Refresh vs Cache Distinction:** Decoupled scheduled ingestion (2-4x daily) from Edge/ISR cache duration (2-5 minutes).
- **Public Routes:** `/api/ipos`, `/api/ipos/[slug]`, `/api/ipos/[slug]/gmp`, `/api/ipos/[slug]/subscription`, `/api/ipos/[slug]/listing`.
- **Ephemeral Allotment Proxy:** `/api/allotment/check` (transient in-memory, zero DB persistence, masked logs).
- **Secret Security:** Server-side environment variables only; zero `NEXT_PUBLIC_` secrets; zero secrets in Git.
