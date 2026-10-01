# IPO Deals — Real-Time Indian IPO Intelligence Platform

A privacy-focused, production-ready Indian Mainboard & SME IPO tracking platform built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS**, **Neon PostgreSQL (Serverless HTTP)**, **Drizzle ORM**, and deployed as a **Cloudflare Worker** via **OpenNext** (`@opennextjs/cloudflare`).

---

## 🚀 Key Features & Architecture

1. **Active-Active Dual Provider Ingestion:**
   - **IPO Alerts:** Basic catalog, exchange categories, dates, issue sizes, price bands, and official links.
   - **IPO Guru:** Real-time Grey Market Premium (GMP), subscription demand (QIB, NII, Retail, Total), face value, fresh issue/OFS breakup, and registrar info.
   - Independent provider execution with non-destructive merger and per-provider quota protection.

2. **Real-Time Market Quotes:**
   - Live LTP (Last Traded Price) and day change integration for listed IPOs using Upstox Market Quote API with in-memory caching.

3. **Source-Grounded AI Insights:**
   - Concise, 2–3 sentence company overviews generated strictly via Google Gemini (`gemini-3.8-flash`) with SHA-256 prompt hashing to prevent redundant API calls.

4. **Security & PAN Data Protection:**
   - Server-side **AES-256-GCM** authenticated encryption for saved PAN cards (`user_pans`).
   - Plaintext PAN numbers never reach the browser, logs, or local storage. Masked display format: `ABCDE****F`.
   - Strict per-user isolation prevents Insecure Direct Object References (IDOR).

5. **Authentication & Legal Consent Gate:**
   - Server-side Google OAuth 2.0 flow with cryptographically random state verification.
   - One-time mandatory consent gate requiring explicit acceptance of Terms of Use (v1.0) and Privacy Policy (v1.0).
   - Version tracking automatically requires re-consent if legal terms are updated.

6. **Cloudflare Workers & Edge Deployment:**
   - Bundled and executed on Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`).
   - Native Cloudflare `scheduled()` handler executes background cron triggers in-process without external HTTP calls.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16.3.5 (App Router, Turbopack) & React 19
- **Runtime Target:** Cloudflare Workers (via `@opennextjs/cloudflare` + Wrangler)
- **Database:** Neon PostgreSQL (Serverless HTTP driver via `@neondatabase/serverless`)
- **ORM:** Drizzle ORM (`drizzle-orm/neon-http`) & Drizzle Kit
- **Styling:** Tailwind CSS & Lucide Icons
- **Security:** AES-256-GCM PAN encryption, HTTP-only SameSite cookies

---

## 📋 Environment Configuration

Copy the template and configure your local environment:

```bash
cp .env.example .env.local
```

### Required Configuration Variables:
- `DATABASE_URL`: Neon PostgreSQL serverless HTTP connection string.
- `CRON_SECRET`: Bearer secret token protecting backend ingestion endpoints.
- `IPO_ALERTS_KEY`: API key for IPO Alerts catalog data.
- `IPO_GURU_KEY`: API key for IPO Guru GMP and subscription data.
- `UPSTOX_ANALYTICS_TOKEN`: Bearer token for Upstox live market quotes.
- `GEMINI_API_KEY`: API key for Gemini company About enrichment (`gemini-3.8-flash`).
- `PAN_ENCRYPTION_KEY`: 256-bit AES-GCM encryption key (64-character hex string).
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Google Cloud OAuth 2.0 credentials.
- `NEXT_PUBLIC_APP_NAME`: Application display name (e.g. `IPO Deals`).
- `NEXT_PUBLIC_APP_URL`: Canonical public URL of the application.

> **SECURITY NOTE:** Never commit `.env.local` to Git. Secret keys must never use the `NEXT_PUBLIC_` prefix.

---

## 💻 Local Development & Quality Commands

```bash
# 1. Install dependencies
npm install

# 2. Run Next.js local development server
npm run dev

# 3. Type check & production Next.js build
npx tsc --noEmit
npm run build

# 4. Compile Cloudflare Worker bundle
npm run build:worker

# 5. Preview locally inside the Cloudflare Worker runtime
npx wrangler dev --env-file .env.local

# 6. Database schema check
npx drizzle-kit check
```

---

## 🚢 Production Deployment Guide

### 1. Database (Neon PostgreSQL)
1. Provision a Neon Serverless PostgreSQL database.
2. Ensure migrations in `drizzle/` are applied to the production database:
   ```bash
   npx drizzle-kit migrate
   ```

### 2. Google OAuth 2.0
In the Google Cloud Console (APIs & Services > Credentials):
- **Authorized JavaScript Origins:** `https://<your-production-domain>`
- **Authorized Redirect URIs:** `https://<your-production-domain>/api/auth/callback/google`

### 3. Cloudflare Workers
1. Configure production secrets via Wrangler CLI (or Cloudflare Dashboard):
   ```bash
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put CRON_SECRET
   npx wrangler secret put IPO_ALERTS_KEY
   npx wrangler secret put IPO_GURU_KEY
   npx wrangler secret put UPSTOX_ANALYTICS_TOKEN
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put PAN_ENCRYPTION_KEY
   ```
2. Build the production Worker artifact:
   ```bash
   npm run build:worker
   ```
3. Deploy to Cloudflare Workers:
   ```bash
   npx wrangler deploy
   ```

### 4. Background Ingestion Crons
The Worker entrypoint (`workers/main.ts`) includes native `scheduled` event handling configured via `wrangler.jsonc`:
- `0 2 * * *` (02:00 UTC) & `0 14 * * *` (14:00 UTC): Full static catalog + dynamic sync.
- `*/30 * * * *` (Every 30 minutes): Dynamic pricing & GMP sync (automatically skipped when no active Open IPOs exist).
