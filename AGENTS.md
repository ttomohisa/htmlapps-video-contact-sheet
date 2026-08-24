# AGENTS.md

## Scope

This repository contains Video Contact Sheet, a Browser Kitty single-HTML app.

## Non-negotiable constraints

- Keep the current app version unless the user asks to bump it.
- Keep the smartphone fixed bottom page tabs (Video / Frames / Generate / Result) and page-switching behavior.
- Keep runtime network access blocked.
- Do not vendor FFmpeg JS/WASM into the source tree.
- Resolve the pinned FFmpeg WASM Builder Release through `dependencies.json`.
- Preserve WORKERFS for input video access.
- Preserve 12 / 24 / 48 frame choices.
- Preserve editable output filename and unchanged-regeneration confirmation.
- Keep source/build/release structure aligned with `htmlapps-lossless-video-cutter`.

## Validation

Run `scripts/check-repository.ps1` before publishing.
