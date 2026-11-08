# DESIGN — Video Contact Sheet

## Direction: a utility workspace, not a landing page

The original PR variant used a full-height dark split hero, dramatic page surfaces, floating card-like controls and duplicated descriptions. They made an everyday tool look like a generic product showcase.

The redesign chooses **an immediately usable editor** instead. On desktop, before a file is selected, a compact 860px two-column setup shows the video chooser, frame count, resolution, timestamp option and disabled Create action. The result pane appears only when a video is selected, at which point the interface expands into an editor with a narrow setting rail and wide result workspace. There is never a huge empty result pane before a video exists. After generation, the result ends with export controls rather than an empty gray tail.

## UI constraints

- No promotional hero, illustrative thumbnails, ornamental status bars, kicker labels, decorative gradients, dark green marketing background, or multi-layer cards.
- Brand green #16624F only for generation/save, selected options and active phone navigation. Neutral white and softly warm gray carry the workspace and image.
- Thin straight dividers (not rounded cards), modest radius 4px on real controls. Settings use conventional labels and group proximity. Keep this as a working web utility.
- Image preview must be uncropped and visually dominant once generated. Output filename, PNG/JPEG, Save and CSV stay immediately beneath it. Empty result remains honestly empty.
- Tight type hierarchy with only one system UI font; compact data labels but no intentionally tiny text. No external font dependency.
- Header names the app. Hide the redundant tagline, marketing-like hero and repeated privacy badge; retain accurate privacy details inside the help and source section.

## Responsive

- Desktop has a persistent 338px option rail and a broad preview; tablet stacks those.
- Phone keeps the current four functional tabs, but uses plain active-state top rules rather than shaded pills. The initial Video page places a plain, full-width primary file button near the top, instead of a lonely drag/drop hero in the middle. Choosing a video advances to Frames, as before. Result metadata becomes a compact borderless line; the result page remains white below the export controls.
- Preserve accessible focus/keyboard behavior, safe-area-aware phone navigation, and no horizontal overflow at 320px. Completed jobs show a short completion label instead of retaining a full progress bar at 100%.
- Keep all existing controls, generation/stop/error states, output preservation after failed regeneration, viewer zoom and help/licensing details.

## Technical boundaries
No runtime network requests or new dependencies; standalone HTML remains completely self-contained. The no-network CSP and original media processing are unchanged. Impeccable's machine checks are a floor, not a substitute for actual rendering and task-based visual critique.
## Mobile follow-up and zoom reliability
- On the Video and Frames phone pages, the Next button lives in a fixed action row immediately above the four-tab bottom navigation. Content gets extra bottom padding so the action row never hides controls. The next step is usable without scrolling to the end of a long settings panel.
- The zoom viewer reuses and temporarily reparents the **original generated canvas**, restoring it on close. There is no canvas-to-PNG encoding, blob URL or asynchronous image-load path on zoom. This avoids the long-lived "Preparing preview" state on phones and preserves the pixels used for PNG/JPEG export.

## Header and help polish
- The original neutral overlay scrim `rgba(18,20,18,.35)` is restored rather than introducing green-tinted dimming. The help text and headings are sized for reading, including inside scrollable phone dialogs.
- At desktop widths, the header uses the same neutral workspace background and aligns its inner contents to the active work surface, rather than appearing as a separate edge-to-edge white banner. The initial centered setup uses its own aligned width; the loaded editor uses the wider workbench width. Tablet aligns to its stacked work surface. Phone stays white with the existing divider and 18px gutters.
- The brand artwork, app title, canonical version and JA/EN Help controls are preserved; the header receives no decorative shadows, translucent blur, gradients or status badges.
