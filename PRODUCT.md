# PRODUCT — Video Contact Sheet

## Job and audience
People reviewing recordings, footage or lectures want to inspect the whole timeline without manually scrubbing. The application makes one contact-sheet image by sampling 12, 24, or 48 evenly spaced video frames.

## Platform
Web, including touch-first mobile browsers. Single-HTML distribution and local `file://` usage matter. The app is bilingual (Japanese and English).

## Core workflow
1. Choose or drop a video.
2. Choose 12 / 24 / 48 frames, output resolution (Light / Standard / High / Ultra), and timestamp overlay.
3. Generate; see progress, stop, or retry.
4. Inspect the resulting image, including zoom; name and save PNG or JPEG, or export the associated timestamp CSV.

On phones the four fixed page tabs (Video / Frames / Generate / Result) switch pages. The previous successful result remains available while an attempt is cancelled or fails.

## Boundaries
- Processing and file handling stay on-device. The standalone runtime blocks network access with `connect-src 'none'`.
- Preserve WORKERFS input, the pinned FFmpeg WASM Builder dependency, output geometry limits, cache, cancellation and exports.
- No account, installation, analytics, uploaded files or runtime CDN.
- Browser Kitty primary color is `#16624F`.
- Scope: operational tool, not a promotional landing page.

This document records existing product facts from APP_SPEC.md and current source.