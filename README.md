# Mainboard IPO Research & Tracking Platform

A privacy-first, free-tier optimized Indian Mainboard IPO tracking platform built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Neon PostgreSQL**, and **Drizzle ORM**.

---

## 📖 Architectural Source of Truth

All approved project specifications and architecture decisions reside in the [`docs/`](./docs) directory:

- [Project Specification](./docs/PROJECT_SPEC.md) — 24 core product features, Mainboard triage policy, and MVP boundaries.
- [System Architecture](./docs/ARCHITECTURE.md) — System topology, decoupled refresh strategy, and SWR caching.
- [Technical Specification](./docs/ARCHITECTURE_SPECIFICATION.md) — Deep technical reference and integration flows.
- [Database Design](./docs/DATABASE_DESIGN.md) — Relational schema definitions and the strict prohibition of `user_pans`.
- [API Strategy](./docs/API_STRATEGY.md) — Endpoint specifications, cache controls, and secret isolation.
- [Decision Log (ADR)](./docs/DECISIONS.md) — 9 locked foundational architecture decisions.

---

## 🔒 Locked Architecture Principles

1. **Mainboard Focus Only:** SME issues (BSE SME / NSE Emerge) are strictly excluded from the user catalog.
2. **Explicit Metadata Triage:** Board classification is determined solely from explicit exchange/provider category metadata. Issue-size heuristics are strictly prohibited.
3. **Neon PostgreSQL Database:** Chosen over Supabase to preserve existing occupied projects and take advantage of serverless HTTP pooling and branching.
4. **Zero Database Retention for PANs:** Under no circumstances will a `user_pans` table exist in PostgreSQL. Allotment lookups are ephemeral in-memory proxies.
5. **Decoupled Ingestion & Caching:** Ingestion occurs 2–4 times/day during market hours (with an explicit manual trigger fallback), while Edge CDN serves cached snapshots via SWR (2–5 minutes).
6. **Free-Tier Target (₹0/Month):** Architected to stay within free allowances of Vercel, Neon, and external APIs for ~500 users.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+ and npm
- A free [Neon PostgreSQL](https://console.neon.tech) account

### 2. Setup Environment
Copy the environment template:
```bash
cp .env.example .env.local
```
Configure your Neon database connection string in `.env.local`:
```env
DATABASE_URL="postgresql://user:password@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
CRON_SECRET="your-super-secret-cron-token"
```

> **SECURITY NOTE:** Never commit `.env.local` to version control. API keys and secrets must never be exposed to the client-side bundle (no `NEXT_PUBLIC_` prefix for secrets).

### 3. Database Schema & Migrations
To generate migration SQL without applying it:
```bash
npm run db:generate
```
Migration SQL files are stored in `drizzle/` for manual inspection before running against any database.

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
Test the health-check endpoint:
```bash
curl http://localhost:3000/api/health
```

---

## 📁 Repository Structure

```
├── docs/                      # Architectural source of truth
├── drizzle/                   # Generated SQL migration files
├── public/                    # Static assets
└── src/
    ├── app/                   # Next.js App Router
    │   ├── api/
    │   │   └── health/        # Health check endpoint (/api/health)
    │   ├── globals.css        # Tailwind CSS imports
    │   ├── layout.tsx         # Root layout shell
    │   └── page.tsx           # Home landing page
    ├── components/            # UI components directory
    │   ├── ui/                # Base primitives
    │   ├── ipo/               # IPO feature widgets
    │   └── layout/            # Navbar, footer, shells
    ├── db/                    # Neon PostgreSQL + Drizzle ORM
    │   ├── index.ts           # Serverless HTTP connection client
    │   └── schema.ts          # Relational table definitions
    └── lib/
        ├── ingestion/         # Data ingestion layer
        │   ├── adapters/      # Upstox, IPO Guru, IPO Alerts placeholders
        │   ├── conflict-resolver.ts # Deterministic field fallback
        │   └── types.ts       # Zod schemas and provider interfaces
        ├── privacy/           # PAN security boundary (deferred module)
        └── utils.ts           # Styling utility (cn)
```

---

## 🧪 Verification & Quality Checks

Run linting and TypeScript checks:
```bash
npm run lint
npx tsc --noEmit
npm run build
```
