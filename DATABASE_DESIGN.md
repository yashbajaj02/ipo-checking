# Database Design & Relational Schema: Neon PostgreSQL

See the complete database schema design at [`docs/DATABASE_DESIGN.md`](file:///home/yash-bajaj/Downloads/project/ipo%20checking/docs/DATABASE_DESIGN.md).

### Core Highlights
- **Engine:** Neon PostgreSQL using Drizzle ORM.
- **Relational Tables:** `users`, `profiles`, `ipos`, `ipo_dates`, `data_sources`, `ipo_gmp_history`, `ipo_subscription_history`, `ipo_listing_results`, `watchlists`, `notifications`, `ingestion_logs`.
- **Category Model:** `MAINBOARD`, `SME`, `UNKNOWN`. Supports querying by `category=MAINBOARD` (default), `category=SME`, or `category=ALL`. `UNKNOWN` is quarantined.
- **Privacy Safeguard:** Explicit permanent prohibition of any `user_pans` table.
