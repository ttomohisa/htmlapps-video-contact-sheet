# Changelog

## Unreleased

- Added local timestamp CSV export from the current generated result, including frame/row/column positions and actual decoded times.
- Fixed image downloads borrowing a later filename or extension when PNG/JPEG encoding completes asynchronously.

## 1.0.1

- Refined the Browser Kitty app icon and synchronized the header icon, embedded favicon, and `assets/favicon.svg`.
- Added desktop workflow highlighting that follows the current step and moves to Result after generation.
- Added mobile fixed page navigation for Video / Frames / Generate / Result and refined the Result screen for one-screen review and saving.
- Added source-to-frames and frames-to-generate next-step links on mobile.
- Added a generation summary showing the selected video, frame count, and timestamp setting.
- Added a “changes not yet applied” indicator after settings are changed following a successful generation.
- Changed result behavior so settings can be edited without clearing the current result; the result refreshes only when Generate is pressed.
- Added editable output filenames and PNG/JPEG extension normalization.
- Added a full-screen result zoom viewer with touch and mouse controls.
- Added save-button iconography and centered the mobile save action.
- Improved source-thumbnail preview, regeneration guidance, scroll positioning, and responsive layout details.
- Refreshed `assets/screenshot.png` and rewrote the Japanese and English README files to match the final UI and behavior.

## 1.0.0

- Initial Video Contact Sheet release.
- Added 12 / 24 / 48 evenly sampled frames.
- Added timestamp overlay and PNG/JPEG output.
- Added local video processing using the pinned FFmpeg WASM Builder `video-contact-sheet` profile.
- Added offline single-HTML build, validation, self-extract, and GitHub Pages workflows.
