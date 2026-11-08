# DESIGN — Video Contact Sheet

## Direction: a working screening room

The **image** is the reason for the interface. The product should feel like a practical screening desk, not a set of generic green cards.

### Two distinct working states
1. **No video:** a large, dark green editing field presents one job: select a video. On wide screens the explanatory headline is the left side of a full-height split composition, with one large upload target on the right; on phones the dark entry surface extends behind the entire first screen. Frame settings and the result pane are temporarily hidden on desktop, because there is nothing to preview yet. On mobile, the existing page tabs remain usable, but the Video page occupies the full available surface.
2. **Video loaded:** the page becomes an asymmetric two-column workspace. The left white control rail is narrow, quiet and well spaced; the much larger right pane is a deep-green viewing stage. The real contact sheet sits here. The save/export area is a crisp white footer directly beneath that image, never another floating card.

The strong contrast is functional: light surfaces are for decisions, dark surfaces are for looking at media. This is **Operate** mode, so typography remains simple and controls recognizable.

### Brand and UI
- Preserve #16624F for primary actions and active states; dark stage is #101F19, not a decorative gradient.
- Flat controls, consistent 6px corners, legible 12–15px utility labels, and 28px frame counts.
- Use one family for Japanese and English interface text. No decorative fonts, fake film-frame images, pseudo-metric cards, glass effects, giant ornamental labels or section numbers.
- Show real filename/duration metadata once loaded. Preserve all limitations and help/licensing text.
- Visually combine the three left workflow sections as one control surface (no nested cards). Hide the duplicate generate summary on wide screens; retain it on the mobile Generate page for orientation.
- Keep zoom, PNG/JPEG, CSV, filename editing and regenerate available alongside real output.

### Responsive and operational boundaries
- At 960px+, show white rail and dark stage side by side; from 601–959px stack them.
- At <=600px, retain the four actual tabs, with safe-area-aware bottom navigation. The Result page is full-bleed dark for preview and white for export.
- Keep focus, selected-state borders, text contrast, error/recovery, file clearing, cancellation, previous completed output and all existing JS operations.
- No additional runtime files or network access. The single HTML stays self-contained, and runtime CSP connect-src 'none' remains in force.
