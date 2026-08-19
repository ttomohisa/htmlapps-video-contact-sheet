# Changelog

## 1.0.0

- Initial Video Contact Sheet release.
- Added a non-blocking source thumbnail preview after video selection when browser-native decoding is available.
- Added 12 / 24 / 48 evenly sampled frames.
- Added HEVC/H.265 including Pixel hvc1/Main10 support through FFmpeg WASM Builder v1.3.0.
- Added timestamp overlay, PNG/JPEG output, and editable output filename.
- Added full-screen result zoom with pinch/wheel zoom, drag panning, Fit/100%, and double-tap/double-click toggle.
- Added confirmation before repeating generation with unchanged video/frame-count settings.
- Added smartphone fixed bottom action bar.
- Aligned repository, validation, self-extract, and GitHub Pages workflow structure with `htmlapps-lossless-video-cutter`.
- Reduced standalone HTML size by embedding the pinned FFmpeg JS/WASM Release assets in gzip form and decompressing them locally on first use.
