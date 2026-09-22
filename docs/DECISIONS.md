# Architecture Decision Log (DECISIONS.md)

See full decision log at [`DECISIONS.md`](file:///home/yash-bajaj/Downloads/project/ipo%20checking/DECISIONS.md).

Summary of Locked Decisions:
- **ADR-001 (Updated):** User-Selectable IPO Types (Mainboard Default, SME and All as Explicit Filters).
- **ADR-002:** Neon PostgreSQL as Primary Database (Instead of Supabase).
- **ADR-003:** Vercel as Initial Hosting Target (Hobby Tier).
- **ADR-004:** Zero Database Retention for User PAN Numbers (No `user_pans` table).
- **ADR-005:** Multi-Provider Data Ingestion Architecture.
- **ADR-006:** Backend-Only External API Calls (Clients read normalized data from DB).
- **ADR-007:** Free-Tier-First MVP Strategy (₹0/Month Goal with documented constraints).
- **ADR-008:** No Issue-Size Heuristic for Mainboard vs SME Classification (Strict explicit category triage).
- **ADR-009:** Client PAN Vault Requires Separate Security Review Before Implementation.
