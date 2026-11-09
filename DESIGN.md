---
version: alpha
name: "Peach Media Cloud"
description: "Enterprise digital-asset operations cockpit in pearl-white with midnight navigation and indigo/peach functional emphasis."
colors:
  primary: "#6355E8"
  primary-dark: "#5040D2"
  primary-light: "#EEEAFD"
  peach: "#FF947C"
  teal: "#1AA99B"
  success: "#1AA578"
  warning: "#DC962B"
  danger: "#DB5B73"
  ink: "#222844"
  muted: "#8189A2"
  background: "#F6F7FC"
  surface: "#FFFFFF"
  border: "#E7EAF4"
  nav: "#171C39"
typography:
  sans:
    fontFamily: "Inter, Noto Sans SC, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
rounded:
  DEFAULT: "0.5625rem"
  sm: "0.5rem"
  md: "0.8125rem"
  lg: "1.125rem"
spacing:
  page-gutter: "1.875rem"
  component-gap: "1rem"
components:
  button: {}
  card: {}
  dialog: {}
  table: {}
  sidebar: {}
---

# Peach Media Cloud — Design System

## Overview

**North Star:** A real enterprise media operations cockpit: calm, information-dense, and trustworthy, closer to a mission-critical asset library than a generic pastel SaaS landing page. The asset-to-worker pipeline is the distinctive signature: users should be able to see a file progress from ingest through verification, processing, publishing, and delivery.

- **Audience:** Chinese-speaking enterprise admins, content teams, developers, and operators.
- **Product register:** High-utility SaaS/admin product rather than marketing page.
- **Primary usage:** 13–24 inch desktop for dense work; responsive inspection on narrow mobile devices.
- **Locale:** Primary `zh-CN`; preserve technical identifiers, Processor names, and APIs in English; native numbers use locale separators.
- **Signature:** Indigo orchestration pipeline, shown prominently on Overview, Workflow, and Processing pages.
- **Anti-references:** An empty CRUD template, all-white table grids with identical cards, neon hacker dashboards, heavily illustrated marketing pages.
- **Token ownership:** Runtime CSS custom properties in `prototype/styles.css` are canonical for the static prototype. This `DESIGN.md` mirrors and explains those values; update both in the same change. Dark mode overrides semantic tokens, not every component separately.

## Colors

Midnight sidebar (`#171C39`), white work surface (`#FFFFFF`), pearl canvas (`#F6F7FC`), indigo action (`#6355E8`), peach accent (`#FF947C`), semantic teal/success/warning/danger. Indigo means orchestration or primary navigation, peach is reserved for ingest highlights and attention, not routine warnings. Use true warning/danger colors for status. In dark mode map semantic backgrounds, ink, borders and muted roles, preserving status meaning.

## Typography

Chinese UI body uses an Inter/system/CJK-capable fallback stack; compact technical identifiers use monospace. Headings 26px, panel titles 14px, body 12–14px, captions 10–11px. Favor disciplined typographic hierarchy and readable mixed Chinese/English; never shrink important action labels below comfortable tap/keyboard target size.

## Layout

- Desktop: 238px fixed sidebar, 72px sticky topbar, max content 1620px, 28–30px content padding.
- Primary 4-column metrics; 2-column panel dashboard; 3/4-column asset cards; collapse to 2 and then 1 column at 1320/760/460 widths.
- Tables scroll inside their container on mobile instead of truncating critical records. Use `min-width` only inside scrollable tables.
- Upload dropzone and drawer detail pages preserve readable layout and clear actions. Reserve height for preview art and charts.

## Elevation & Depth

Use subtle `--shadow` and thin borders for card separation; topbar and sidebar provide structural grounding. No large shadows on every table row. Modal/drawer uses clear elevated layer against translucent deep blue scrim.

## Shapes

Rounded controls 9px, content cards 13px, hero 17px, modal 17px. Functional assets are rectilinear with soft corners; status pills have full radius. Pipeline nodes use consistent stroke and radius; never use decorative arrows unless they denote real sequence.

## Components

- **Buttons:** Indigo filled = primary; outlined = secondary; warm red = destructive. Loading, disabled, and permission denial must not be encoded by color alone.
- **Sidebar:** Persistent product domain groups; active state indigo with visible text and icon; navigation remains keyboard focusable.
- **Cards:** Strong label/value/status separation; decorative asset thumbnails are visually distinct but never the only way to identify file type.
- **Table:** Compact density, visible column headers, explicit actions, scrollable on mobile. Search, filter, empty and no-results states are always provided.
- **Form:** Native accessible inputs/selects, required-field validation, actionable errors and first-invalid focus; do not expose secret values in saved state.
- **Overlay:** Single active modal or drawer; ESC to dismiss; backdrop dismiss; on creation, focus first input/action. Production implementation must add complete focus trap/restore.
- **Toast:** Small neutral status in lower right; errors use semantic distinct style and do not claim backend success when only a demo mutation occurred.
- **Motion:** 100–220ms restrained feedback on primary interaction; obey `prefers-reduced-motion`.
- **Content:** Use Chinese labels for user tasks, English only for standards and processor terms. The demo always says that it is simulated, avoiding misleading operational claims.

## Do's and Don'ts

- Do show media lifecycle, job state, quota, and execution modes as separate concepts.
- Do protect tenant context in every query and render path, including details and edit operations.
- Do keep demos interactive, with filtered data and visible recovery.
- Don't call a simulated upload a real file transfer, simulated Worker an actual K8s Pod, or local fixture numbers production statistics.
- Don't equate role/tenant/project/asset permission checks or conflate Job/Attempt/RuntimeTask state.
