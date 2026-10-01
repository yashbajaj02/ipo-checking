# UI Implementation Plan: Apex Dalal Terminal (Mainboard & SME Support)

See the complete UI/UX implementation plan at [`docs/UI_IMPLEMENTATION_PLAN.md`](./docs/UI_IMPLEMENTATION_PLAN.md).

### Core Highlights
- **Design System:** Apex Dalal Terminal (Google Stitch specification from `design/DESIGN.md`).
- **Global IPO Type Filter:** Segmented control `[ Mainboard (Default) | SME | All ]`.
- **Visual Distinction:** Solid Emerald for `MAINBOARD`; Amber outline chip for `SME` (with lot-size advisory).
- **Aesthetic:** Minimalist High-Density Modernism with Tonal Layering (Deep Obsidian `#0B0F17`, Emerald `#00D084`, Amber `#F59E0B`, Iris `#6366F1`).
- **Typography:** Hanken Grotesk + JetBrains Mono with tabular numbers.
- **Privacy Alignment:** Zero database retention for PANs. Allotment UI boundary operates ephemerally.
- **Phased Implementation:** Design tokens → Base components → Dashboard → IPO Detail page → Interactive modals.
