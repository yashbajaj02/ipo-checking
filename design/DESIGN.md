---
name: Apex Dalal Terminal
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353942'
  surface-container-lowest: '#0a0e16'
  surface-container-low: '#181c24'
  surface-container: '#1c2028'
  surface-container-high: '#262a33'
  surface-container-highest: '#31353e'
  on-surface: '#dfe2ee'
  on-surface-variant: '#bacbbd'
  inverse-surface: '#dfe2ee'
  inverse-on-surface: '#2c3039'
  outline: '#859588'
  outline-variant: '#3c4a40'
  surface-tint: '#31e193'
  primary: '#43ed9e'
  on-primary: '#003920'
  primary-container: '#00d084'
  on-primary-container: '#005331'
  inverse-primary: '#006d43'
  secondary: '#ffb95f'
  on-secondary: '#472a00'
  secondary-container: '#ee9800'
  on-secondary-container: '#5b3800'
  tertiary: '#cecdff'
  on-tertiary: '#1000a9'
  tertiary-container: '#adafff'
  on-tertiary-container: '#2f2ebf'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#59fead'
  primary-fixed-dim: '#31e193'
  on-primary-fixed: '#002111'
  on-primary-fixed-variant: '#005231'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#0f131c'
  on-background: '#dfe2ee'
  surface-variant: '#31353e'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-numeric-lg:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 24px
  label-numeric-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
  label-numeric-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style
The design system establishes an authoritative, high-density financial command center engineered specifically for retail and high-net-worth investors navigating the Indian primary capital markets (NSE & BSE). The aesthetic merges the unyielding analytical precision of Bloomberg terminals with the approachable elegance of high-grade modern fintech platforms like Zerodha Kite and Groww. 

Visual style leans into **Minimalist High-Density Modernism with Tonal Layering**. It prioritizes extreme data clarity, structured tabular information, and instant visual comprehension of volatile metrics like Grey Market Premium (GMP) and multi-tranche subscription oversubscription multiples. The interface exudes institutional credibility: sharp, deliberate, high-contrast, yet refined with deep jewel-toned surfaces that mitigate cognitive fatigue during rapid trading sessions.

## Colors
The palette is rooted in an institutional deep-space obsidian tone (`#0B0F17`), engineered to render intense numerical density comfortably over long trading days. 

- **Primary (`#00D084`)**: An electric emerald green, calibrated specifically for positive equity metrics, strong GMP upward trends, and successful UPI bidding states.
- **Secondary (`#F59E0B`)**: An amber-gold hue representing Grey Market Premium (GMP) activity, closing-soon alerts, and moderate oversubscription pressure.
- **Tertiary (`#6366F1`)**: A technical iris violet used for institutional investor quotas (QIB allotment tracking) and secondary analytics indicators.
- **Semantic Alert (`#F43F5E`)**: A high-visibility crimson reserved strictly for negative GMP, down-revisions, and IPO subscription under-runs.

### Theming & Layering
While dark mode is the default baseline for low glare during market hours (09:15 to 15:30 IST), light mode transforms the canvas into a crisp, editorial bone-white (`#F8FAFC`) with deep graphite text (`#0F172A`) and preserved emerald/amber indicator weights. Surface containers rely on stepped luminance increments (`#111827`, `#1F2937`, `#374151`) rather than heavy borders.

## Typography
Typography is separated into two tactical engines: **Hanken Grotesk** handles structural narratives, company prospectuses, and UI interaction states with contemporary corporate sharpness, while **JetBrains Mono** is enforced across all financial values, Indian Rupee (`₹`) symbols, lot calculations, cutoff prices, and quota multiples.

### Tabular Numbers & Currency Representation
All numeric levels (`label-numeric-*`) must render with open-type feature flags `tnum` (tabular numbers) and `zero` (slashed zero) active. The Indian Rupee symbol must never clip ascenders or descenders and must align vertically with the x-height of numeric strings. Uppercase metadata labels (`label-caps`) employ a `+0.05em` letter spacing for legibility across tight analytical grids.

## Layout & Spacing
The layout model is anchored by a high-density, 12-column fluid grid system across desktop monitors, transitioning to a consolidated 6-column system on tablets and a streamlined single/dual-column flow on mobile viewport sizes. 

### Breakpoints & Reflow
- **Desktop (≥ 1280px)**: 12 columns, 24px (`gutter-desktop`) gutters, and 32px canvas margins. Supports tri-panel layouts: Market Overview / Live IPO Book / Order Execution & Mandate Panel.
- **Tablet (768px – 1279px)**: 6 columns, 16px (`gutter`) gutters, with secondary panels collapsible into floating sheets.
- **Mobile (< 768px)**: Reflows critical subscription progress and GMP indicators into horizontally scrollable metric rails and full-width card stacks.

Vertical rhythm relies strictly on a 4px/8px micro-grid. Component padding is intentionally compact (`space-sm` to `space-md`) to ensure critical metrics remain above the fold without sacrificing breathing room.

## Elevation & Depth
Depth in this design system rejects heavy, muddy dropshadows in favor of **structural tonal stepping combined with low-contrast luminance borders (ghost outlines)**.

1. **Surface 0 (Canvas Base)**: `#0B0F17` (Deep Obsidian).
2. **Surface 1 (Cards, Ticker Strips, Tables)**: `#111827` overlaid with an inner border of `rgba(255, 255, 255, 0.06)`.
3. **Surface 2 (Hover States, Active Metric Chips, Dropdowns)**: `#1F2937` with an inner border of `rgba(255, 255, 255, 0.12)`.
4. **Surface 3 (Modals, Bid Sheets, UPI Validation Drawers)**: `#1E293B` anchored by an ambient directional shadow: `0 12px 32px -4px rgba(0, 0, 0, 0.6)`.

When highlighting volatile data—such as a spiking GMP percentage—elements apply a soft emerald or amber radial luminescence (`0 0 20px -6px rgba(0, 208, 132, 0.15)`) behind the numerical container, simulating hardware-level terminal backlighting.

## Shapes
The shape strategy relies on **Level 1 (Soft)** rounding. Standard interactive elements, metric cells, and bid cards feature crisp 4px (`0.25rem`) corner radii, escalating to 8px (`0.5rem`) on master containers and modal boundaries. 

This restrained geometry preserves horizontal and vertical terminal lines, preventing the visual softness that detracts from professional financial tools, while keeping touch targets ergonomically viable on mobile devices.

## Components

### Buttons & Order Triggers
- **Primary Action (Apply IPO / Cut-Off Bid)**: Background `#00D084`, foreground `#0B0F17` (rich black for peak contrast), font-weight 600. Radius `4px`. Hover triggers a brightness shift (`1.05`) without layout shift.
- **Secondary (Calculate GMP / View RHP)**: Transparent background, 1px solid border of `rgba(255, 255, 255, 0.16)`, foreground `#E2E8F0`. Hover uses Surface 2 background fill.
- **Destructive / Revoke Bid**: Subtle deep crimson outline (`#F43F5E`) with smooth background transition on active confirmation.

### Subscription Progress Gauges (QIB / NII / Retail)
- Multi-segment linear track system.
- Unfilled background: `#1F2937`.
- **Retail Segment (RII)**: Filled with Primary Emerald (`#00D084`).
- **Non-Institutional (NII)**: Filled with Secondary Amber (`#F59E0B`).
- **Qualified Institutional (QIB)**: Filled with Tertiary Iris (`#6366F1`).
- Oversubscription (>1.0x) is conveyed by a bright end-cap notch and an accompanying tabular multiplier tag (`e.g., 24.8x`) in `label-numeric-sm`.

### Data Cards & IPO Rows
- Container: Surface 1 (`#111827`) with `0.25rem` radius and 1px border.
- Company branding appears alongside NSE/BSE ticker tags, issue size in Crores (`₹ Cr`), and issue price band.
- Key figures (Price Band, GMP, Lot Size, Listing Date) are arranged in strict vertical pairs: upper `label-caps` in muted grey, lower `label-numeric-md` in high-contrast crisp white or semantic emerald.

### Form Inputs & Lot Size Selectors
- Background `#0F172A`, 1px border `rgba(255, 255, 255, 0.1)`. Focus state illuminates the border with `#00D084` and an outer 2px soft ring (`rgba(0, 208, 132, 0.2)`).
- UPI ID input features a fixed trailing badge verifying VPA validity (`@okhdfcbank`, `@paytm`, `@ybl`).
- Lot multiplier controls use split button steppers with monospaced quantity and calculated total cost calculation running synchronously below.

### Chips & GMP Badges
- Muted semantic pill structures. A positive GMP uses `rgba(0, 208, 132, 0.12)` background with `#00D084` text and an upward trend vector (`▲ ₹145 (42.5%)`).
- SME IPOs receive an amber outline chip to instantly alert retail investors to the minimum ₹1,00,000+ lot size constraints.