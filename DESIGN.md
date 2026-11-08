# DESIGN — Video Contact Sheet

## Direction: a utility workspace, not a landing page

The original PR variant used a full-height dark split hero, dramatic page surfaces, floating card-like controls and duplicated descriptions. They made an everyday tool look like a generic product showcase.

The redesign chooses **an immediately usable editor** instead. The complete tool is present on load: video chooser, 12/24/48, resolution, timestamp option and a disabled Generate action on a quiet left utility rail; a large neutral result canvas occupies the right. The structure does not jump after loading a file.

## UI constraints

- No promotional hero, illustrative thumbnails, ornamental status bars, kicker labels, decorative gradients, dark green marketing background, or multi-layer cards.
- Brand green #16624F only for generation/save, selected options and active phone navigation. Neutral white and softly warm gray carry the workspace and image.
- Thin straight dividers (not rounded cards), modest radius 4px on real controls. Settings use conventional labels and group proximity. Keep this as a working web utility.
- Image preview must be uncropped and visually dominant once generated. Output filename, PNG/JPEG, Save and CSV stay immediately beneath it. Empty result remains honestly empty.
- Tight type hierarchy with only one system UI font; compact data labels but no intentionally tiny text. No external font dependency.
- Header names the app. Hide the redundant tagline, marketing-like hero and repeated privacy badge; retain accurate privacy details inside the help and source section.

## Responsive

- Desktop has a persistent 338px option rail and a broad preview; tablet stacks those.
- Phone keeps the current four functional tabs, but uses plain active-state top rules rather than shaded pills. The initial Video page centers only the file selection action; choosing a video advances to Frames, as before.
- Preserve accessible focus/keyboard behavior, safe-area-aware phone navigation, and no horizontal overflow at 320px.
- Keep all existing controls, generation/stop/error states, output preservation after failed regeneration, viewer zoom and help/licensing details.

## Technical boundaries
No runtime network requests or new dependencies; standalone HTML remains completely self-contained. The no-network CSP and original media processing are unchanged. Impeccable's machine checks are a floor, not a substitute for actual rendering and task-based visual critique.