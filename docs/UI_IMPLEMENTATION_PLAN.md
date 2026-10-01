# UI/UX Implementation Plan: Apex Dalal Terminal (Mainboard & SME Support)

Based on the Google Stitch design specification ([`design/DESIGN.md`](../design/DESIGN.md)) and aligned strictly with the architectural source of truth in [`docs/`](./).

---

## 1. Executive Alignment & Architectural Guardrails

| Principle | Design Element | Architectural Constraint (docs/) | Reconciliation / Resolution |
|---|---|---|---|
| **Product Scope** | Stitch contains visual styling for both Mainboard and SME badges. | **ADR-001 (Updated):** Supports **BOTH Mainboard and SME IPOs** via a user-selectable global filter. | Implement a prominent global IPO Type segmented control: `[ Mainboard (Default) | SME | All ]`. Default selected is `Mainboard`. |
| **SME Visual Alert** | Stitch specifies: *"SME IPOs receive an amber outline chip to instantly alert retail investors to the minimum ₹1,00,000+ lot size constraints."* | **PROJECT_SPEC:** Retail investors must be clearly alerted when viewing SME issues due to higher ticket size and illiquidity. | Apply Amber outline badge (`border: #F59E0B, text: #F59E0B`) + tooltip/banner highlighting minimum ₹1L+ ticket size when SME issues are displayed. |
| **Data Integrity** | Real-time tickers and live subscription bars. | **API_STRATEGY / ARCHITECTURE:** Decoupled scheduled ingestion (2-4x daily); SWR Edge caching (2-5m). | UI renders snapshot timestamps (`Updated: DD/MM HH:mm IST`) rather than misleading real-time streaming claims. |
| **PAN Privacy** | Form inputs for PAN / allotment lookup. | **ADR-004 / ADR-009:** Zero database retention; ephemeral lookup; PAN vault deferred for security review. | Allotment lookup UI operates strictly ephemerally in RAM. No local storage or DB storage implemented in initial UI. |
| **Cost Target** | High-density charts and multi-panel layouts. | **ADR-007:** ₹0/month free-tier budget (Neon + Vercel). | SVG/CSS-based charts and zero heavy third-party visualization runtimes; lightweight Tailwind CSS tokens. |

---

## 2. Design Tokens & Styling Architecture

The design system implements **Minimalist High-Density Modernism with Tonal Layering** (Stitch "Apex Dalal Terminal").

### 2.1 Color Palette

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

  /* Secondary Analytics, GMP & SME Alert (Amber) */
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

1. **Hanken Grotesk** — Structural headings, navigation, prospectuses, UI controls.
2. **JetBrains Mono** — All numeric values, currency symbols (`₹`), lot calculations, and subscription multiples (`24.8x`) with open-type feature flags `tnum` (tabular numbers) and `zero` (slashed zero).

---

## 3. Page-by-Page UI Breakdown

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             MAIN APPLICATION SHELL                              │
│  [Logo / Dalal Terminal]   [GLOBAL IPO TYPE: Mainboard | SME | All]   [Search]  │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
       ┌─────────────────────────────────┴─────────────────────────────────┐
       ▼                                                                   ▼
┌────────────────────────────────────────┐         ┌──────────────────────────────┐
│            DASHBOARD ROUTE             │         │       IPO DETAIL ROUTE       │
│                  (/)                   │         │        (/ipos/[slug])        │
│                                        │         │                              │
│ • Global IPO Type Switcher             │         │ • IPO Header & Category Pill │
│   (Mainboard [Default] | SME | All)    │         │   (MAINBOARD or SME Alert)   │
│ • Market Pulse Ticker                  │         │ • Investment Metrics Grid    │
│ • Status Tabs (Open/Upcoming/Closed)   │         │ • Interactive Timeline       │
│ • High-Density IPO Cards               │         │ • GMP Trend Chart            │
│ • Category Badges (Emerald/Amber)      │         │ • Multi-Segment Subscriptions│
│ • Multi-Tranche Progress Bars          │         │ • Prospectus (DRHP/RHP) Links│
└────────────────────────────────────────┘         │ • Listing vs. GMP Scorecard  │
                                                   └──────────────────────────────┘
```

### 3.1 Page 1: Dashboard & Discovery (`/`)

- **Global IPO Type Filter (Prominent Control):**
  - Segmented switcher: `[ Mainboard (Default) | SME | All ]`.
  - Clearly highlights active filter with glowing outline and count indicator.
  - Updates URL search query `?category=MAINBOARD` / `?category=SME` / `?category=ALL` for shareable state.
- **Header / Navigation:**
  - Branding: *"Apex Dalal Terminal"* with live status chip (`● MARKET OPEN` / `○ MARKET CLOSED`).
  - Search Input: Real-time client filtering for company names and symbols.
- **Market Pulse Strip (Top Banner):**
  - Dynamic summary based on active category: Active Open IPOs, Upcoming issues, Average GMP gain.
- **Segmented Status Tabs:**
  - `Ongoing / Open` (Active bidding).
  - `Upcoming` (Scheduled issues).
  - `Closed & Listed` (Completed issues).
- **IPO Data Cards / Grid:**
  - High-density card presentation on Surface 1 (`#111827`).
  - **Category Badge:**
    - Mainboard: Solid Emerald pill (`MAINBOARD`).
    - SME: Amber outline chip (`SME IPO`) with lot size badge (`Min ₹1.2L+`).
  - Metric Columns:
    - Price Band: `₹[min] - ₹[max]`
    - Lot Size & Min Investment: `[size] shares (₹[amount])`
    - GMP Badge: Muted pill with directional vector (`▲ +₹[val] (+[pct]%)`)
    - Subscription Progress Track: Multi-segment linear bar (QIB / NII / Retail) with total oversubscription tag (`24.8x`).
    - Bidding Timeline: Countdown badge (`Closing in 1d 4h`).

### 3.2 Page 2: IPO Detail & Deep Research (`/ipos/[slug]`)

- **Hero Header Section:**
  - Company Name, exchange ticker, and prominent Category Badge (`MAINBOARD` in Emerald, or `SME` in Amber with minimum investment advisory banner).
  - Status Banner: `BIDDING OPEN` with remaining countdown timer.
- **Core Investment Metrics Grid:**
  - Floor & Cap Price, Lot Size, Minimum Retail Investment (`price_max * lot_size`).
  - Total Issue Size in ₹ Crores, with Fresh Issue vs. Offer for Sale (OFS) breakdown.
  - Quota allocations (% Retail, % QIB, % NII).
- **Chronological Timeline Tracker:**
  - Stepped horizontal progress bar tracking key milestones.
- **Grey Market Premium (GMP) Analytics Card:**
  - Latest GMP quote, % estimated gain, calculated expected listing price.
  - Historical SVG mini-chart with non-official disclaimer and timestamp.
- **Multi-Segment Subscription Gauge & Table:**
  - Multi-segment linear gauge showing demand across QIB (Iris), NII (Amber), and Retail (Emerald).
  - Breakdown table with sNII, bNII, Retail, and Total multiples.
- **Listing Scorecard (Listed issues):**
  - Issue Price vs. Opening Listing Price and GMP Accuracy Scorecard.

---

## 4. Component Hierarchy & Reusable Library

```
src/components/
├── layout/
│   ├── AppHeader.tsx            # Terminal navigation, live status, search trigger
│   ├── AppFooter.tsx            # Disclaimer, methodology, market hours notice
│   ├── CategoryFilter.tsx       # Global IPO Type Switcher [Mainboard | SME | All]
│   └── MarketTickerStrip.tsx    # Compact market summary ticker
├── ui/
│   ├── Button.tsx               # Primary emerald, secondary ghost, outline actions
│   ├── Badge.tsx                # Status pills, category chips (MAINBOARD & SME)
│   ├── GmpBadge.tsx             # Semantic pill with radial glow (▲ / ▼)
│   ├── Card.tsx                 # Surface 1 container with ghost border
│   ├── Tabs.tsx                 # Segmented status controls (Open/Upcoming/Closed)
│   ├── Modal.tsx                # Surface 3 dialog with keyboard focus trap
│   ├── Skeleton.tsx             # Zero-layout-shift pulse loaders
│   └── Input.tsx                # High-contrast inputs with emerald focus ring
└── ipo/
    ├── IpoCard.tsx              # Comprehensive card (with Mainboard / SME badges)
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
| **Desktop** | `>= 1280px` | 12-column grid, 24px gutters, 32px canvas margin. | Category filter in top bar alongside search. Detail page side-by-side modules. |
| **Tablet** | `768px – 1279px` | 6-column grid, 16px gutters, 20px canvas margin. | Category filter spans full-width sticky secondary bar. |
| **Mobile** | `< 768px` | 1-column fluid flow, 12px gutters, 16px margin. | Cards stack vertically. Category segmented control sits directly under header. |

---

## 6. Phased UI Implementation Order

```
Phase 1: Design Tokens & Base Shell (Tailwind CSS, fonts, root layout, header, footer)
                          │
                          ▼
Phase 2: Global Category Switcher & UI Primitives (CategoryFilter, Button, Card, Badge)
                          │
                          ▼
Phase 3: Dashboard & Discovery Page (Market ticker, segmented tabs, high-density cards)
                          │
                          ▼
Phase 4: IPO Deep Research Detail Page (Metrics grid, timeline, GMP chart, subscription gauge)
                          │
                          ▼
Phase 5: Interactive Features & Modals (Search dialog, Watchlist drawer, Allotment UI boundary)
```
