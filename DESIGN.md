# DESIGN — Video Contact Sheet

## Direction
**A practical contact-sheet workbench.** Neutral paper-like surfaces and restrained green actions; the result image is the visual subject, not decorative UI.

This application is an **Operate** surface. Fast scanning, readable choices, clear state and reliable saving take precedence over animation and ornament.

## Hierarchy and layout
- **Desktop (from 960 CSS px):** compact introduction, a left settings rail (video → frame count and resolution → generate), and a wider sticky right preview/result pane.
- **Intermediate widths (601–959 CSS px):** one clear vertical flow without cramped side-by-side controls.
- **Phone (up to 600 CSS px):** preserve the four real page views and fixed bottom tabs. Each view shows only its own task; never collapse everything into one long page.
- **Before generation:** the result area shows a schematic 4 × 3 contact sheet, labeled as an empty state, never pretend footage.
- **After generation:** actual Canvas image leads; saved-file controls follow it. Keep filenames and CSV export explicit.

## Tokens
- Main brand/action: `#16624F`; deeper green `#0C4B3A`.
- Background: `#F6F8F5`; panels: `#FFFFFF`; secondary surface: `#F3F6F3`.
- Text: `#1D3028`; supporting text: `#52665C`; outlines: `#DAE3DB`.
- 8–12 px control/panel corners, no decorative gradient or glass effect.
- System UI type stack with Japanese fallback; large titles are modest, controls are legible at phone scale.
- SVG icons only. Existing app favicon artwork must remain recognizable.

## Interaction principles
- Prioritize file choice and generate as primary actions; selection is expressed by border, surface and semantic `aria-pressed`, not color alone.
- Reuse existing safe state lifecycle for empty, busy, stop, success, failed attempt, pending setting changes, and unchanged-regeneration confirmation.
- Keep zoom, filename editing, PNG/JPEG switching, and CSV export discoverable without crowding initial setup.
- Preserve keyboard focus, modal traps, reduced motion, tap targets and safe-area insets.

## Non-goals
Do not change FFmpeg/WASM implementation, file format capabilities, privacy wording, generated results, Browser Kitty home-page copy or version as part of this visual redesign.