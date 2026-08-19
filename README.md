# Video Contact Sheet

Create one image that summarizes an entire video. The app samples 12, 24, or 48 frames evenly across the source and combines them into a contact sheet entirely in the browser.

## Features

- Lightweight source thumbnail appears immediately when the browser can decode the selected video; unsupported preview formats fall back to the normal video icon without delaying generation
- 12 / 24 / 48 evenly sampled frames
- MP4/MOV, MKV/WebM, AVI, MPEG-TS and other containers supported by the compact FFmpeg profile
- H.264, HEVC/H.265 including Pixel hvc1/Main10, VP8/VP9, AV1, MPEG-4, MJPEG, ProRes and more
- Optional timestamp labels on each cell
- **Full-screen zoom preview** with pinch/pan on touch, wheel/pan on desktop, and Fit / 100% controls
- PNG or JPEG output
- Editable output filename with automatic extension normalization
- Confirmation before repeating a generation with unchanged video and frame-count settings
- WORKERFS input so large videos are not copied wholesale into MEMFS first
- Fully local runtime with `connect-src 'none'`
- Smartphone fixed bottom bar: Video / Frames / Generate / Save
- Japanese / English UI
- Single standalone HTML plus self-extracting HTML

## Quick start

Open the generated `video-contact-sheet.html` in a modern Chromium-based browser, select a video, choose 12/24/48 frames, and generate the sheet. Tap/click the result to open the full-screen zoom viewer before saving.

## Build

The repository does not commit FFmpeg JS/WASM binaries. `dependencies.json` pins **FFmpeg WASM Builder v1.3.0** and the `video-contact-sheet` Release asset.

On Windows:

```bat
build-standalone.bat
```

The build downloads the pinned GitHub Release, verifies its entry in `SHA256SUMS.txt`, embeds the verified `ffmpeg.js` and `ffmpeg.wasm` into `dist/index.html`, creates `dist/index.self-extract.html`, and copies the standalone app to `video-contact-sheet.html`.

No Python, Node.js, or local web server is required for the normal build.

## Repository layout

```text
.
├─ src/index.template.html
├─ dependencies.json
├─ app.config.json
├─ build-standalone.bat
├─ build-standalone.ps1
├─ update-ffmpeg.bat
├─ scripts/
│  ├─ check-repository.ps1
│  ├─ check-source.ps1
│  ├─ verify-standalone.ps1
│  ├─ build-self-extract.ps1
│  ├─ verify-self-extract.ps1
│  └─ update-ffmpeg.ps1
├─ schemas/
├─ docs/
├─ dist/
└─ .github/workflows/
   ├─ build-standalone.yml
   ├─ validate.yml
   └─ deploy-pages.yml
```

## Update FFmpeg WASM

```bat
update-ffmpeg.bat 1.4.0
```

The helper updates the pinned Builder version, downloads and verifies the new Release, rebuilds, and restores the old pin if the build fails.

## Privacy

The selected video stays on the device. The standalone HTML blocks runtime network connections with CSP. GitHub Pages naturally serves the initial HTML, but the application does not upload the selected video.

## License

Application source: MIT. The generated standalone HTML includes an FFmpeg WebAssembly core distributed under LGPL-2.1-or-later. See `THIRD_PARTY_NOTICES.md`.

### Compact standalone core

The standalone HTML stores the pinned `ffmpeg.js.gz` and `ffmpeg.wasm.gz` Release assets directly instead of Base64-encoding their uncompressed forms. They are decompressed in memory only when generation first starts. This reduces the HTML size while keeping the same offline FFmpeg core and output quality.
