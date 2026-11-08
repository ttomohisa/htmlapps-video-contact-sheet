# DESIGN — Video Contact Sheet
## Working purpose
This is an **Operate** surface. Its sole task is to turn a local video into a contact-sheet image and make saving that image reliable. The generated image, not the application chrome, is the thing to inspect.

## Layout and hierarchy
- A compact product header and one explanatory sentence. No promotional hero, cosmetic step labels or ornamental previews.
- On wide screens, a 300–360 px column contains video selection, frame count, resolution, timestamps and Generate. A larger right pane is reserved for the result image and export.
- Each input group is separated primarily by whitespace rather than its own colored card. Only the actual video drop zone, summary, and result frame need a boundary.
- Before a video is generated, the result surface is deliberately blank except for the explanatory empty state; there is no simulated thumbnail imagery.
- Tablet widths use a single vertical flow; phones retain the four **real page tabs**, not scroll links.
- The actual contact sheet is displayed without cropping; zoom and save live immediately adjacent to the real result. After generation, the mobile result pane shrinks to the image and export actions instead of leaving a blank viewport-sized tail.

## Visual system
- Browser Kitty green `#16624F` is reserved for the primary Generate/Save actions and selected states.
- Warm neutral light canvas `#F7F8F6`, white controls, dark green-tinted ink `#202B25`, and low-contrast dividers `#D5DDD6`.
- Controls use compact 4–6px radii, a small number of type sizes and clear focus outlines. No drop shadows on forms, no blur or animated entrance effects.
- Use existing SVG app icon; no decorative icon tiles or fake contact-sheet images.
- Functional text is at least 11px; main body and control text generally 12px or larger.
- Honor `prefers-reduced-motion`, touch-safe controls, keyboard focus, and screen-reader state.

## Interaction states
- A selected file replaces the drop area with a file tile. Clearing resets the file state.
- 12/24/48, four resolution settings and timestamps remain directly editable.
- Keep the generated result on cancellation/failure and show clear pending settings.
- Preserve zoom, filename, format toggle, JPEG/PNG, CSV export, and regenerate controls, including phone bottom safe area.
- Keep original file handling and local `connect-src 'none'` network boundary.

## Non-goals
No FFmpeg changes, new runtime dependencies, altered output formats, new permissions or Browser Kitty homepage copy changes.
