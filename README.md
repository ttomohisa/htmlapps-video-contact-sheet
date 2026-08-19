# Video Contact Sheet

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-video-contact-sheet/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-video-contact-sheet/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-video-contact-sheet/)

[日本語版 README](README.ja.md)

A privacy-focused, single-HTML app that samples a video across its full duration and combines the frames into one contact-sheet image entirely in the browser.

Choose **12, 24, or 48 frames** depending on how much detail you need. Video Contact Sheet is useful for quickly scanning movies, surveillance footage, screen recordings, lectures, long camera clips, and other videos without scrubbing through the entire timeline.

## 🚀 Live demo

### [Open Video Contact Sheet on GitHub Pages](https://ttomohisa.github.io/htmlapps-video-contact-sheet/)

GitHub Pages delivers the initial HTML. After it loads, the selected video is read locally, FFmpeg WebAssembly seeks to evenly spaced positions, the frames are decoded, and the final image is created on your device. The app does not upload the selected video.

## Features

- Create one overview image from **12 / 24 / 48 evenly sampled frames**
- Sample across the full video rather than decoding the entire file sequentially
- Support common video containers including MP4/MOV, MKV/WebM, AVI, and MPEG-TS through the compact FFmpeg profile
- Decode H.264, HEVC/H.265 including Pixel `hvc1` / Main10, VP8, VP9, AV1, MPEG-4, MJPEG, ProRes, and other enabled codecs
- Show an optional timestamp on every frame so you can jump back to the approximate position in the source video
- Show a lightweight source thumbnail immediately when the browser can decode the selected video
- Silently fall back to the normal video icon when the browser cannot create the source thumbnail
- Open the generated sheet in a **full-screen zoom viewer before saving**
- Pinch to zoom and drag to pan on touch devices
- Mouse-wheel zoom and drag panning on desktop
- **Fit** and **100%** viewer controls, plus double-tap / double-click zoom toggle
- Save as PNG or JPEG
- Edit the output filename before saving, with automatic extension normalization
- Confirm before repeating an expensive generation when the selected video and frame count have not changed
- Use WORKERFS so large input videos are not copied wholesale into MEMFS before processing
- Fixed mobile bottom bar with **Video / Frames / Generate / Save**
- Japanese and English UI in the same HTML
- Embedded SVG favicon
- Gzip-packed embedded FFmpeg JavaScript and WebAssembly to reduce standalone HTML size
- Build both `dist/index.html` and `dist/index.self-extract.html`
- Runtime network access blocked with `connect-src 'none'`

## Quick start

### Use the web demo

Just [open the demo](https://ttomohisa.github.io/htmlapps-video-contact-sheet/). No installation or account is required.

### Use it fully offline (advanced)

1. Download or clone this repository.
2. Run `build-standalone.bat` on Windows.
3. The first build downloads the exact FFmpeg WASM Builder release pinned in `dependencies.json`.
4. The release archive and corresponding-source archive are verified against `SHA256SUMS.txt`.
5. Copy the generated `dist/index.html` wherever you need it.
6. Open that single file later without an internet connection.

```powershell
.\build-standalone.bat
```

Python, Node.js, and a local web server are not required for the normal build. The builder uses Windows PowerShell and GitHub Release assets.

## Usage

1. Drop a video onto the page or choose one from the file picker.
2. If the browser can decode the source directly, a small preview thumbnail appears in the selected-file card. This preview is optional and does not block generation.
3. Choose **12**, **24**, or **48** frames.
4. Keep timestamp labels enabled when you want to identify where each frame came from.
5. Select **Generate contact sheet**.
6. Review the generated image. Tap or click it to open the full-screen zoom viewer when you need to inspect individual frames more closely.
7. Edit the save filename if needed.
8. Save the result as PNG or JPEG.

### Frame count

| Frames | Layout | Best for |
| ---: | --- | --- |
| **12** | 4 × 3 | Fast overview of the entire video |
| **24** | 6 × 4 | Balanced overview for normal use |
| **48** | 8 × 6 | Closer inspection of long or information-dense footage |

More frames give a finer timeline overview, but each cell becomes smaller in the final sheet. Use the zoom viewer when inspecting a 48-frame result on a phone.

### Zoom controls

| Control | Action |
| --- | --- |
| Tap / click the result | Open the full-screen viewer |
| Pinch | Zoom in / out on touch devices |
| One-finger drag | Pan while zoomed on touch devices |
| Mouse wheel | Zoom in / out on desktop |
| Mouse drag | Pan while zoomed on desktop |
| Double-tap / double-click | Toggle between fitted view and 100% |
| **Fit** | Fit the entire contact sheet in the viewer |
| **100%** | Show the image at its actual pixel size |

Viewer zoom changes only the inspection view. It does not change the generated image, saved resolution, or PNG/JPEG contents.

### Output filename

The initial filename is based on the source video and selected frame count, for example:

```text
movie_contact-sheet_24.png
```

You can edit the filename before saving. Switching between PNG and JPEG keeps the entered basename and normalizes only the extension.

### Re-generation confirmation

After a successful generation, Video Contact Sheet remembers the source file identity and selected frame count. If you press Generate again without changing those settings, the app asks for confirmation before repeating the same FFmpeg operation.

Changing the video or switching between 12 / 24 / 48 frames generates immediately without that confirmation.

## How generation works

Video Contact Sheet is designed for long videos without decoding every frame from beginning to end.

1. Mount the selected `File` / `Blob` through WORKERFS
2. Determine 12, 24, or 48 positions spread across the full duration
3. Seek near each target position
4. Decode only the frame needed for that sample
5. Convert sampled frames to RGB and arrange them into one contact sheet
6. Return the compact sheet to the page
7. Render it to Canvas
8. Add optional timestamp labels
9. Save the Canvas as PNG or JPEG

The FFmpeg runner produces an RGB PPM sheet rather than carrying a PNG/JPEG encoder inside the WASM core. Final image encoding is handled by the browser's Canvas APIs, which keeps the FFmpeg build smaller.

### Source thumbnail is separate from FFmpeg generation

The small thumbnail shown after video selection uses the browser's native `<video>` decoder, not FFmpeg WASM. It captures one small representative frame asynchronously and never delays the Generate action.

Because browser codec support differs by platform, the source thumbnail may be unavailable for formats such as some HEVC or MKV files even when the FFmpeg generation path supports them. In that case the app simply keeps the normal video icon.

## Publish with GitHub Pages

The repository includes a workflow that builds the fully embedded HTML and deploys it to GitHub Pages automatically.

1. Push the repository to GitHub as `htmlapps-video-contact-sheet`.
2. Open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Push to `main`, or manually run the deployment workflow from the Actions tab.
4. After a successful deployment, the app is available at `https://ttomohisa.github.io/htmlapps-video-contact-sheet/`.

If Pages is not enabled yet, the workflow still builds and uploads the standalone artifacts and skips only the deployment step. Enable GitHub Actions as the Pages source, then re-run the workflow.

Each push to `main` rebuilds the standalone HTML from the pinned dependency, verifies the generated artifacts, and publishes only after the repository checks pass.

## Development and build layout

```text
.
├─ src/index.template.html            # Application template
├─ app.config.json                    # App metadata, version, and output settings
├─ dependencies.json                  # Pinned FFmpeg WASM Builder release and assets
├─ build-standalone.bat               # Windows build entry point
├─ build-standalone.ps1               # Single-HTML builder
├─ update-ffmpeg.bat                   # Dependency update helper
├─ scripts/
│  ├─ check-repository.ps1            # Repository-wide build validation
│  ├─ check-source.ps1                # Source/network-boundary validation
│  ├─ verify-standalone.ps1           # Standard HTML verification
│  ├─ build-self-extract.ps1          # Gzip self-extracting HTML builder
│  ├─ verify-self-extract.ps1         # Self-extract verification
│  └─ update-ffmpeg.ps1               # FFmpeg Builder version updater
├─ schemas/
│  ├─ app-config.schema.json
│  └─ dependencies.schema.json
├─ docs/
│  ├─ ARCHITECTURE.md
│  └─ LLM_WORKFLOW.md
├─ dist/
│  ├─ index.html                      # Generated standalone application
│  ├─ index.self-extract.html         # Generated self-extracting variant
│  ├─ dependency-manifest.json        # Resolved dependency hashes and source links
│  └─ self-extract-manifest.json      # Self-extract verification metadata
└─ .github/workflows/
   ├─ build-standalone.yml            # Build validation and artifact upload
   ├─ validate.yml                    # Source + standalone validation
   └─ deploy-pages.yml                # Automatic Pages deployment from main
```

The repository intentionally does **not** commit a `vendor/` directory containing FFmpeg JavaScript or WebAssembly binaries.

### Update FFmpeg WASM

The current build pins FFmpeg WASM Builder `v1.3.0` and the `video-contact-sheet` profile in `dependencies.json`.

To update the Builder version from Windows:

```powershell
.\update-ffmpeg.bat 1.4.0
```

The helper updates the version pin, rebuilds the standalone output, and restores the previous version if the build fails.

To discard the local dependency cache and download the pinned release again:

```powershell
.\build-standalone.bat -ForceDownload
```

The build process automatically:

- Downloads the pinned `ffmpeg-wasm-video-contact-sheet-v{version}.zip` from GitHub Releases
- Downloads `SHA256SUMS.txt`
- Verifies the profile archive checksum
- Verifies that the matching corresponding-source archive is listed in the checksum file
- Reads the release-provided `ffmpeg.js.gz` and `ffmpeg.wasm.gz`
- Base64-embeds the compressed assets once in the standalone HTML
- Unpacks those assets locally at runtime with `DecompressionStream('gzip')`
- Records release URLs, checksums, asset sizes, and corresponding-source information in `dist/dependency-manifest.json`
- Rejects unexpected external runtime script, stylesheet, frame, or CSS URL references
- Verifies `connect-src 'none'`
- Generates the gzip self-extracting HTML variant
- Verifies that the self-extracting payload restores the source HTML byte-for-byte

Packing the already-gzipped FFmpeg assets instead of Base64-embedding their uncompressed bytes significantly reduces the standard single-HTML file size without changing video processing behavior.

## Privacy and runtime network protection

The generated HTML includes:

- A Content Security Policy containing `connect-src 'none'`
- No runtime dependency downloads
- No external runtime scripts or stylesheets
- Blob/WORKERFS access to the user-selected local video
- Locally embedded, gzip-packed FFmpeg JavaScript and WebAssembly

The GitHub Pages version requires an initial HTML request, but the selected video, decoded frames, thumbnails, contact sheet, and saved image are not transmitted by the app.

For use with the network completely disconnected, open the generated `dist/index.html` locally.

## Supported formats and limitations

- The FFmpeg profile supports common containers such as MP4/MOV, MKV/WebM, AVI, MPEG-TS/PS, FLV, ASF, and Ogg where the enabled demuxers can identify the file.
- Enabled video decoders include H.264, HEVC/H.265, VP8, VP9, AV1, MPEG-4, MPEG-1/2, MJPEG, ProRes, and Theora.
- Pixel HEVC recordings using `hvc1` / Main10 are handled by the FFmpeg generation path rather than relying on browser-native playback support.
- The small source thumbnail depends on browser-native video decoding and may therefore be unavailable even when contact-sheet generation works.
- Corrupted files, unusual container variants, unsupported codec profiles, encrypted/protected media, or malformed timestamps may fail to decode.
- Large 48-frame sheets require more browser memory than 12-frame sheets, although the source video itself is accessed through WORKERFS rather than copied wholesale into MEMFS.
- The app creates a visual overview; it is not a forensic frame extractor and does not guarantee exact frame accuracy for every variable-frame-rate or unusual timestamp layout.
- `DecompressionStream` is required to unpack the compressed embedded FFmpeg assets. Current Chrome, Edge, Firefox, and Safari are recommended.

## Dependencies

| Dependency | Version | License | Purpose |
| --- | ---: | --- | --- |
| FFmpeg WASM Builder `video-contact-sheet` profile | 1.3.0 | Generated FFmpeg core: LGPL-2.1-or-later | Container parsing, seeking, video decoding, scaling, and RGB contact-sheet generation |

Canvas composition, timestamp labels, PNG/JPEG saving, source thumbnail preview, zoom viewer, mobile UI, and filename handling are implemented by the app. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency and corresponding-source details.

## License

Copyright © 2026 ttomohisa

Application source is licensed under the [MIT License](LICENSE).

The generated standalone HTML also contains an FFmpeg WebAssembly core distributed under LGPL-2.1-or-later. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
