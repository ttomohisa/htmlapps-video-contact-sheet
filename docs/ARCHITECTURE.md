# Architecture

```text
Repository build time
  dependencies.json (Builder v1.3.0 pinned)
       ↓
  GitHub Release + SHA256SUMS.txt
       ↓ verify
  ffmpeg.js + ffmpeg.wasm
       ↓ embed
  video-contact-sheet.html

Browser runtime
  selected File / Blob
       ↓ structured clone
  Blob Worker
       ↓ WORKERFS mount
  compact FFmpeg video-contact-sheet runner
       ↓ seek + decode selected frames
  RGB PPM + JSON metadata
       ↓
  Canvas
       ↓
  PNG / JPEG save
```

The repository intentionally does not commit a `vendor/` copy of the Builder binary package. Build-time dependency resolution, checksum verification, manifests, standalone verification, self-extract generation, and GitHub Pages workflows mirror the Lossless Video Cutter repository.

The input File/Blob remains Blob-backed in the Worker and WORKERFS reads slices as FFmpeg seeks. The final PPM sheet is small relative to the source video and is returned to the page for Canvas rendering.

## Source thumbnail

The selected-file thumbnail is deliberately separate from FFmpeg WASM. A temporary browser-native `<video>` reads the local Blob URL, captures a small representative frame to Canvas, and is immediately released. Failure is silent and leaves the fallback video icon visible, so unsupported browser codecs do not slow or block the FFmpeg generation path.
