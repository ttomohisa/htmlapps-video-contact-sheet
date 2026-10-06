# APP_SPEC — Video Contact Sheet

## Goal

Create a single local image that summarizes a video by sampling evenly across its full duration.

## Core behavior

- User selects a video File/Blob.
- The FFmpeg WASM `video-contact-sheet` profile from Builder v1.3.0 is mounted with WORKERFS.
- The runner seeks to 12, 24, or 48 evenly spaced positions and decodes the required frames.
- The runner returns one RGB PPM sheet plus JSON metadata.
- The browser converts the PPM sheet to Canvas and saves PNG or JPEG.
- No video is uploaded.


## Source thumbnail preview

After a video is selected, the app attempts a lightweight browser-native preview without starting FFmpeg WASM. It seeks to an early representative point (about 8% of duration, capped near 5 seconds), captures a small JPEG thumbnail, and shows it inside the selected-file card. The operation is asynchronous and never blocks Generate. If the browser cannot decode the source (for example some HEVC/MKV combinations), the thumbnail attempt is abandoned silently and the normal video icon remains. No FFmpeg initialization is triggered only for this preview.

## Zoom preview

After generation, the result canvas can be opened in a full-screen inspection viewer without changing the saved image. Touch devices support pinch zoom and one-finger panning; desktop supports mouse-wheel zoom and drag panning. Fit and 100% controls are always available, and double-tap/double-click toggles 100% view.

## Output filename

After generation, the save filename is editable beside the format and save controls. Switching PNG/JPEG normalizes the extension without discarding the user-entered basename.

## Timestamp CSV export

A secondary local CSV action exports only the current successful result’s stored sample metadata. Columns are `frame,row,column,actual_seconds,timestamp`; positions are 1-based and stored sample order is preserved. Decoded seconds are not recalculated. Timestamp strings reuse the image label formatter regardless of overlay setting. CSV uses UTF-8 with CRLF rows and conventional escaping. No source or user-entered text is included in cells.

The filename is a sanitized displayed output basename with its terminal image extension removed and `_timestamps.csv` appended; blank/all-dot names use `contact-sheet`. Export is disabled without a generated result and complete finite metadata; invalid metadata shows a localized error in Result. Pending settings do not affect export until successful regeneration. No runner calls, Canvas changes, network, clipboard, storage, or dependencies are added. Each image save captures its normalized filename before asynchronous encoding.

## Unchanged regeneration guard

The app records a signature of the last successful generation using source file identity (name, size, lastModified) plus the selected frame count. If Generate/Regenerate is invoked again with the same signature and the previous result is still current, a confirmation dialog is shown before repeating the expensive operation.

## Mobile UX

At phone widths the fixed bottom bar contains exactly four page tabs:

- Video
- Frames
- Generate
- Result

Tapping a tab switches the visible page itself; it does not scroll to a section on one long page. Generate remains a normal button inside the Generate page, while saving remains inside the Result page.

## Privacy and network boundary

The generated standalone app has `connect-src 'none'`, no runtime external scripts, and no runtime dependency downloads. Build time obtains the pinned Builder Release and verifies SHA-256 before embedding it.

## Dependency model

The source repository does not vendor FFmpeg JS/WASM. `dependencies.json` points to `ttomohisa/htmlapps-ffmpeg-wasm-builder` v1.3.0 and the `ffmpeg-wasm-video-contact-sheet-v{version}.zip` release asset. The repository build follows the same dependency-manifest/self-extract workflow as `htmlapps-lossless-video-cutter`.

## Standalone size

The pinned FFmpeg JavaScript and WebAssembly assets are embedded from the Builder Release in gzip form and expanded locally with the browser Compression Streams API only when the engine is first needed. This keeps the normal standalone HTML substantially smaller without changing output quality or network/privacy behavior.
