# Impeccable design review — Video Contact Sheet

## Why this iteration was necessary

The previous design still resembled a generated promotional landing page: a dark two-color hero, an oversized headline, a huge dashed upload card, broad empty regions and repetitive captions. That is not how someone uses a contact-sheet utility. Merely passing the Impeccable detector did not establish visual quality.

## Design decisions

The new interface is **a neutral video editing workspace on first load**, not a hero screen.

- The compact source chooser, 12/24/48 selection, four resolutions, timestamp switch and Generate button remain visible even before a file is loaded. The Generate button is disabled until there is a file.
- The large right pane is a neutral gray preview for the actual generated image. No sample frames or invented media.
- The app uses white, quiet gray and small areas of #16624F for actions/selection, rather than full-bleed dark-green branding.
- Settings are separated by straight dividers and proximity, not layers of rounded cards. Output actions stay with the real image.
- The existing four mobile pages remain functional. Before selection, the Video page has one centrally presented file-selection task. On file selection the app advances to frame settings.
- The standalone HTML's media processing, offline CSP, zoom, PNG/JPEG, CSV export, regeneration, cancel/error behavior, file clearing and help/licensing content remain unchanged.

## Impeccable workflow

The PR installs the pinned official Impeccable 4.8.1 skill and runs its verified engine (0.1.19) in the dedicated Impeccable design review GitHub Actions workflow. The engine runs context, concept-seed (Operate mode), and detect --json.

On UI source revision 039db13, the static detector exited **0 (no findings)**. This is a mechanical check, **not** a proof of visual quality. We separately inspected rendered screens and real-video behavior.

An interactive Impeccable direction-choice page, its injected live design overlay, and a two-agent critique were **not executed**. Do not claim that they were. The context command also reports a legacy PRODUCT.md schema; fixing that record requires confirmed product facts, not speculation.

## Rendered and functional verification

Tested **the generated standalone HTML artifact**, not a mockup, in headless Chromium.

- 1440×900 desktop, 768×1024 tablet, 390×844 mobile and 320×700 narrow mobile, with no document-level horizontal overflow or page JavaScript errors.
- Loaded a local short H.264 MP4 and successfully generated a 12-frame contact sheet at all four viewport sizes. PNG download succeeded at each size.
- Independently tested Japanese on desktop and English on mobile with PNG, JPEG and timestamp CSV exports; image zoom opened/closed, the help dialog opened/closed, and exports used the expected extensions.
- Network monitoring found no HTTP(S) requests, only local Blob URL requests associated with video processing/export.
- GitHub regression checks cover the full generation state lifecycle and standalone build integrity.

## Remaining release checks

Physical phone/touch operation, very long files, memory-constrained devices, alternative codecs/containers, HDR color accuracy and cross-browser review were not all re-run in this design pass. README screenshots are not yet updated. Keep the PR Draft until the user accepts the actual look and release review is complete.
