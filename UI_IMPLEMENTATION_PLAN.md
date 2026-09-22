# UI Implementation Plan: Apex Dalal Terminal

See the complete UI/UX implementation plan at [`docs/UI_IMPLEMENTATION_PLAN.md`](file:///home/yash-bajaj/Downloads/project/ipo%20checking/docs/UI_IMPLEMENTATION_PLAN.md).

### Core Highlights
- **Design System:** Apex Dalal Terminal (Google Stitch specification from `design/DESIGN.md`).
- **Aesthetic:** Minimalist High-Density Modernism with Tonal Layering (Deep Obsidian `#0B0F17`, Emerald `#00D084`, Amber `#F59E0B`, Iris `#6366F1`).
- **Typography:** Hanken Grotesk (structural copy) + JetBrains Mono with tabular numbers (financial metrics).
- **Scope Alignment:** Mainboard IPOs only (SME excluded from views).
- **Privacy Alignment:** Zero database retention for PANs. Allotment UI boundary operates ephemerally.
- **Phased Implementation:** Design tokens → Base components → Dashboard → IPO Detail page → Interactive modals.
