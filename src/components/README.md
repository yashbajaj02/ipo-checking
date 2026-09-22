# UI Components Architecture

This directory houses reusable presentational and interactive components for the Mainboard IPO platform.

## Subdirectory Structure
- `ui/`: Core primitive components (buttons, badges, cards, modals, tabs).
- `ipo/`: IPO-specific feature widgets (GMP trend badge, subscription progress bar, timeline tracker).
- `layout/`: App shell, navbar, and footer.

All components adhere to:
1. Pure Tailwind CSS styling.
2. Dark-mode friendly, accessible colors.
3. Server-component first paradigm (interactive hooks placed inside explicitly marked `'use client'` files).
