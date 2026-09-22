# UI/UX Implementation Plan: Apex Dalal Terminal

Based on the Google Stitch design specification ([`design/DESIGN.md`](file:///home/yash-bajaj/Downloads/project/ipo%20checking/design/DESIGN.md)) and aligned strictly with the architectural source of truth in [`docs/`](file:///home/yash-bajaj/Downloads/project/ipo%20checking/docs/).

---

## 1. Executive Alignment & Architectural Guardrails

| Principle | Design Element | Architectural Constraint (docs/) | Reconciliation / Resolution |
|---|---|---|---|
| **Product Scope** | Stitch mentions SME chips/tags. | **ADR-001 / PROJECT_SPEC:** Mainboard IPOs ONLY. SME IPOs are strictly excluded. | Adopt the visual badge style for category labels, but **strictly exclude SME IPOs** from product feeds and routes. |
| **Data Integrity** | Real-time tickers and live subscription bars. | **API_STRATEGY / ARCHITECTURE:** Decoupled scheduled ingestion (2-4x daily); SWR Edge caching (2-5m). | UI renders snapshot timestamps (`Updated: DD/MM HH:mm IST`) rather than misleading real-time streaming claims. |
| **PAN Privacy** | Form inputs for PAN / UPI / allotment lookup. | **ADR-004 / ADR-009:** Zero database retention; ephemeral lookup; PAN vault deferred for security review. | Allotment lookup UI operates strictly ephemerally in RAM. No local storage or DB storage implemented in initial UI. |
| **Cost Target** | High-density charts and multi-panel layouts. | **ADR-007:** ₹0/month free-tier budget (Neon + Vercel). | SVG/CSS-based charts and zero heavy third-party visualization runtimes; lightweight Tailwind CSS tokens. |

---

## 2. Design Tokens & Styling Architecture

The design system implements **Minimalist High-Density Modernism with Tonal Layering** (Stitch "Apex Dalal Terminal").

### 2.1 Color Palette (CSS Variables & Tailwind Config)

```css
:root {
  /* Canvas & Tonal Surfaces */
  --bg-canvas: #0b0f17;             /* Deep Obsidian (Surface 0) */
  --surface-1: #111827;             /* Cards, Tickers, Tables (Surface 1) */
  --surface-2: #1f2937;             /* Hover states, Active chips (Surface 2) */
  --surface-3: #1e293b;             /* Modals, Drawers (Surface 3) */
  --surface-border: rgba(255, 255, 255, 0.06);
  --surface-border-strong: rgba(255, 255, 255, 0.12);

  /* Primary Brand & Equity Indicator (Emerald) */
  --color-primary: #00d084;
  --color-primary-dim: #003920;
  --color-primary-glow: rgba(0, 208, 132, 0.15);

  /* Secondary Analytics & GMP Indicator (Amber) */
  --color-secondary: #f59e0b;
  --color-secondary-dim: #472a00;
  --color-secondary-glow: rgba(245, 158, 11, 0.15);

  /* Tertiary Institutional Quota Indicator (Iris) */
  --color-tertiary: #6366f1;
  --color-tertiary-dim: #1000a9;

  /* Semantic Alerts & Error (Crimson) */
  --color-error: #f43f5e;
  --color-error-dim: #690005;

  /* Typography & Foreground */
  --text-primary: #dfe2ee;
  --text-secondary: #bacbbd;
  --text-muted: #859588;
}
```

### 2.2 Typography Hierarchy

Two designated font engines:
1. **Hanken Grotesk** — Structural headings, navigation, prospectuses, UI controls.
2. **JetBrains Mono** — All numeric values, currency symbols (`₹`), lot calculations, and subscription multiples (`24.8x`) with open-type feature flags `tnum` (tabular numbers) and `zero` (slashed zero).

| Token | Family | Size | Weight | Line Height | Purpose |
|---|---|---|---|---|---|
| `headline-xl` | Hanken Grotesk | 40px (28px mobile) | 700 | 48px / 36px | Hero page titles, primary IPO name |
| `headline-lg` | Hanken Grotesk | 30px (22px mobile) | 600 | 38px / 28px | Section titles, modal headers |
| `headline-md` | Hanken Grotesk | 20px | 600 | 26px | Card titles, category headers |
| `body-lg` | Hanken Grotesk | 16px | 400 | 24px | Descriptive text, company profiles |
| `body-md` | Hanken Grotesk | 14px | 400 | 20px | Standard data labels, table cells |
| `body-sm` | Hanken Grotesk | 12px | 400 | 16px | Micro-copy, timestamp footnotes |
| `label-numeric-lg` | JetBrains Mono | 20px | 600 | 24px | Primary price bands, total issue sizes |
| `label-numeric-md` | JetBrains Mono | 14px | 500 | 18px | GMP values, lot sizes, min investment |
| `label-numeric-sm` | JetBrains Mono | 11px | 500 | 14px | Table multiples, oversubscription tags |
| `label-caps` | Hanken Grotesk | 11px | 600 | 14px | Uppercase metadata tags (`+0.05em`) |

### 2.3 Geometry, Borders, & Elevation
- **Corner Radii:** Strict **Level 1 (Soft)** rounding — `4px` (`rounded`) for interactive controls, cards, and badges; `8px` (`rounded-lg`) for modals and top-level containers.
- **Elevation:** Tonal stepping (`#0B0F17` → `#111827` → `#1F2937`) coupled with 1px low-contrast ghost borders (`rgba(255, 255, 255, 0.06)`).
- **Luminescence:** Radial backlighting for volatile high-gain GMP badges (`0 0 20px -6px rgba(0, 208, 132, 0.15)`).

---

## 3. Page-by-Page UI Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MAIN APPLICATION SHELL                          │
│  [Logo / Dalal Terminal]  [Live Market Status]  [Search]  [Watchlist]  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┴────────────────────────────┐
       ▼                                                         ▼
┌───────────────────────────────┐         ┌──────────────────────────────┐
│       DASHBOARD ROUTE         │         │      IPO DETAIL ROUTE        │
│             (/)               │         │        (/ipos/[slug])        │
│                               │         │                              │
│ • Market Pulse Ticker         │         │ • IPO Header & Status Chip   │
│ • Status Tabs (Open/Upcoming) │         │ • Investment Metrics Grid    │
│ • Filter & Search Controls    │         │ • Interactive Timeline       │
│ • High-Density IPO Cards      │         │ • GMP Trend Chart            │
│ • Multi-Tranche Progress Bars │         │ • Multi-Segment Subscriptions│
│ • Pagination / Empty States   │         │ • Prospectus (DRHP/RHP) Links│
└───────────────────────────────┘         │ • Listing vs. GMP Scorecard  │
                                          └──────────────────────────────┘
```

### 3.1 Page 1: Dashboard & Discovery (`/`)

- **Header / Navigation:**
  - Branding: *"Apex Dalal Terminal"* with live status chip (`● MARKET OPEN` / `○ MARKET CLOSED`).
  - Search Input: Real-time client filtering for company names and symbols with keyboard shortcut (`⌘K` / `/`).
  - Watchlist Shortcut: Toggle button showing count of saved IPOs.
- **Market Pulse Strip (Top Banner):**
  - Summary metric chips: Active Mainboard IPOs, Upcoming issues this week, Average GMP gain across active issues.
- **Segmented Status Tabs:**
  - `Ongoing / Open` (Primary default tab for active bidding).
  - `Upcoming` (Issues scheduled with confirmed dates).
  - `Closed & Listed` (Recently completed issues).
- **IPO Data Cards / Grid:**
  - High-density card presentation conforming to Surface 1 (`#111827`).
  - Company Title + Symbol (`NSE: ABC`) + Category Badge (`MAINBOARD`).
  - Metric Columns:
    - Price Band: `₹[min] - ₹[max]`
    - Lot Size & Min Investment: `[size] shares (₹[amount])`
    - GMP Badge: Muted pill with directional icon (`▲ +₹[val] (+[pct]%)`)
    - Subscription Progress Track: Multi-segment linear bar (QIB / NII / Retail) with total oversubscription tag (`24.8x`).
    - Bidding Timeline: Close date countdown badge (`Closing in 1d 4h`).
- **Interactive States:**
  - Skeleton Loading: 4-card pulsed skeleton placeholders preserving exact height to prevent layout shifts.
  - Empty State: Clean terminal message when no issues match filter: *"No active Mainboard IPOs currently open for bidding."*

### 3.2 Page 2: IPO Detail & Deep Research (`/ipos/[slug]`)

- **Hero Header Section:**
  - Company Name, exchange ticker, and sector tag.
  - Quick action toolbar: Watchlist toggle button, official RHP download link.
  - Current Status Banner: `BIDDING OPEN` with remaining hours/days timer.
- **Core Investment Metrics Grid (3x2 Desktop, 1x6 Mobile):**
  - Floor & Cap Price, Lot Size, Minimum Retail Investment (`price_max * lot_size`).
  - Total Issue Size in ₹ Crores, with explicit Fresh Issue vs. Offer for Sale (OFS) breakdown.
  - Face Value and Quota allocations (% Retail, % QIB, % NII).
- **Chronological Timeline Tracker:**
  - Stepped horizontal progress bar tracking key milestones:
    - Bidding Open → Bidding Close → Allotment Date → Refund Date → Demat Credit → Listing Date.
  - Active step highlighted in Emerald (`#00D084`); past steps marked with checkmark.
- **Grey Market Premium (GMP) Analytics Card:**
  - Prominent latest GMP quote, % estimated gain, and calculated expected listing price (`Cap Price + GMP`).
  - Date-wise historical trend mini-chart (SVG line chart with emerald gradient fill).
  - Non-official disclaimer badge: *"Non-official market sentiment quote. Updated: [Date/Time] (Source: [Provider])."*
- **Multi-Segment Subscription Gauge & Table:**
  - Large segmented linear gauge showing proportional demand across QIB (Iris), NII (Amber), and Retail (Emerald).
  - Granular table breaking down:
    - Qualified Institutional Buyers (QIB)
    - Small NII (₹2L - ₹10L)
    - Big NII (> ₹10L)
    - Retail Individual Investors (RII)
    - Total Subscription multiple
- **Listing Scorecard (Active only when status = `LISTED`):**
  - Issue Price vs. Opening Listing Price.
  - Listing Day Gain/Loss (% and ₹).
  - GMP Accuracy Scorecard: Comparison of final pre-listing GMP estimate vs. actual listing opening price.

### 3.3 Page 3: Watchlist Drawer / Modal

- **Presentation:** Slide-over drawer on desktop; full-width bottom sheet on mobile.
- **Content:** Quick list of user-favorited Mainboard IPOs with live status and GMP change indicators.
- **Persistence:** Client-side local session storage.

### 3.4 Page 4: Ephemeral Allotment Check Modal (Deferred Functional Boundary)

- **Presentation:** Centered Surface 3 dialog (`#1E293B`) with directional backdrop shadow.
- **Form Elements:**
  - IPO Issue selector (populated with recently closed Mainboard IPOs).
  - PAN Number input field with uppercase auto-formatting and format validator (`[A-Z]{5}[0-9]{4}[A-Z]{1}`).
  - Zero-Retention Security Notice: *"Zero Data Retention Guarantee: Your PAN is processed strictly in temporary server memory and is NEVER saved in our database."*
- **Execution:** Calls ephemeral proxy route `POST /api/allotment/check`. Displays allotment result card (Allotted / Not Allotted / Awaiting Registrar Publication).

---

## 4. Component Hierarchy & Reusable Library

```
src/components/
├── layout/
│   ├── AppHeader.tsx            # Terminal navigation, live status, search trigger
│   ├── AppFooter.tsx            # Disclaimer, methodology, market hours notice
│   └── MarketTickerStrip.tsx    # Compact market summary ticker
├── ui/
│   ├── Button.tsx               # Primary emerald, secondary ghost, outline actions
│   ├── Badge.tsx                # Status pills, category chips (MAINBOARD)
│   ├── GmpBadge.tsx             # Semantic pill with radial glow (▲ / ▼)
│   ├── Card.tsx                 # Surface 1 container with ghost border
│   ├── Tabs.tsx                 # Segmented status controls (Open/Upcoming/Closed)
│   ├── Modal.tsx                # Surface 3 dialog with keyboard focus trap
│   ├── Skeleton.tsx             # Zero-layout-shift pulse loaders
│   └── Input.tsx                # High-contrast inputs with emerald focus ring
└── ipo/
    ├── IpoCard.tsx              # Comprehensive card for dashboard listing
    ├── IpoMetricsGrid.tsx       # Lot size, issue size, price band grid
    ├── TimelineTracker.tsx      # Multi-step IPO lifecycle milestone progress
    ├── GmpTrendChart.tsx        # Lightweight SVG line chart for GMP history
    ├── SubscriptionGauge.tsx    # Multi-segment QIB/NII/Retail progress bar
    ├── SubscriptionTable.tsx    # Detailed category breakdown table
    └── ListingScorecard.tsx     # Post-listing outcome & GMP accuracy check
```

---

## 5. Responsive Behavior & Viewport Breakpoints

| Viewport | Screen Width | Grid & Layout Architecture | Reflow Rules |
|---|---|---|---|
| **Desktop** | `>= 1280px` | 12-column grid, 24px gutters, 32px canvas margin. | Dual-column or tri-panel layouts. Detail view splits metrics, charts, and subscriptions into balanced side-by-side modules. |
| **Tablet** | `768px – 1279px` | 6-column grid, 16px gutters, 20px canvas margin. | Metrics grid condenses to 2 columns. Timeline tracker switches to condensed horizontal scroll. |
| **Mobile** | `< 768px` | 1-column fluid flow, 12px gutters, 16px margin. | Cards stack vertically. Subscriptions collapse into stacked single-category bars. Navigation collapses to sticky bottom bar or top burger. |

---

## 6. Data Requirements & Static vs. Database-Driven Matrix

| UI Component | Data Source | Nature | Caching / Delivery Rule |
|---|---|---|---|
| **Market Status Banner** | System clock (09:15–15:30 IST) | Static / Client-calculated | 0 database impact. |
| **IPO List / Cards** | `ipos` + `ipo_dates` + latest GMP | Database-driven | ISR cached (`s-maxage=300, SWR=600`). |
| **Status Tabs Filtering** | Query param (`?status=OPEN`) | Database-driven filter | Handled via URL state and RSC query. |
| **IPO Detail Profile** | `ipos` table (slug lookup) | Database-driven | ISR cached (`revalidate=300`). |
| **Timeline Tracker** | `ipo_dates` table | Database-driven | Delivered with IPO detail payload. |
| **GMP Trend Chart** | `ipo_gmp_history` table | Database-driven time-series | Cached route (`s-maxage=120, SWR=600`). |
| **Subscription Gauge** | `ipo_subscription_history` | Database-driven | Cached route (`s-maxage=120, SWR=600`). |
| **Listing Scorecard** | `ipo_listing_results` table | Database-driven | Static post-listing (`s-maxage=600`). |
| **Watchlist** | Browser `localStorage` | Client-only | 0 database read/write. |
| **Allotment Check Result** | Ephemeral API proxy | Dynamic (Transient RAM) | `no-store, max-age=0`. Zero DB write. |

---

## 7. Elements Dependent on Future External APIs

1. **Live Bidding Multiples:** Relies on the upcoming Phase 1 evaluation of BSE/NSE subscription feeds from Upstox or IPO Guru.
2. **GMP Quotations:** Relies on confirmed scraper/API adapters for non-official sources (IPO Guru, IPO Alerts).
3. **Allotment Registrar Status:** Relies on registrar proxy adapter (LinkIntime, KFintech, Bigshare).
4. **DRHP / RHP Regulatory Documents:** Sourced from SEBI / exchange filings via broker feeds.

---

## 8. Accessibility & Ergonomics Requirements

- **Contrast Ratios:** Text on deep obsidian canvas (`#0B0F17`) achieves minimum **WCAG AA** standard (4.5:1 for body copy, 3:1 for large headings).
- **Tabular Numerics:** Enforce `font-variant-numeric: tabular-nums slashed-zero;` on all JetBrains Mono elements to prevent jitter during updates.
- **Keyboard Navigation:** All interactive chips, tabs, search inputs, and modal triggers support `Tab`, `Shift+Tab`, `Enter`, and `Escape`.
- **Screen Reader Semantics:**
  - Trend badges use accessible labels (`aria-label="Grey Market Premium plus 145 rupees, 42 percent gain"`).
  - Progress bars expose `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, and `aria-valuemax="100"`.

---

## 9. Phased UI Implementation Order

```
Phase 1: Design Tokens & Base Shell (Tailwind CSS, fonts, root layout, header, footer)
                          │
                          ▼
Phase 2: Reusable Primitive Components (Button, Card, Badge, GmpBadge, Tabs, Skeleton)
                          │
                          ▼
Phase 3: Dashboard & Discovery Page (Market ticker, segmented tabs, high-density IPO cards)
                          │
                          ▼
Phase 4: IPO Deep Research Detail Page (Metrics grid, timeline, GMP chart, subscription gauge)
                          │
                          ▼
Phase 5: Interactive Features & Modals (Search dialog, Watchlist drawer, Allotment UI boundary)
```

---

## 10. Architectural Consistency Verification

- [x] **PROJECT_SPEC.md Check:** Strictly Mainboard IPOs only. No SME cards or views published.
- [x] **ARCHITECTURE.md Check:** Decoupled data model maintained. No client calls to external APIs. SWR caching respected.
- [x] **DATABASE_DESIGN.md Check:** All visual fields map 1:1 to existing tables (`ipos`, `ipo_dates`, `ipo_gmp_history`, `ipo_subscription_history`, `ipo_listing_results`).
- [x] **DECISIONS.md Check:** Zero `user_pans` database retention enforced. No premature PAN vault code.
- [x] **API_STRATEGY.md Check:** Endpoint schemas align directly with required component props.
