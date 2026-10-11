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

## Bounded contact-sheet workers

The page can run two independent single-thread WASM instances, without SharedArrayBuffer, pthreads, or COOP/COEP headers. Automatic selection requires both at least 4 logical processors and a reported `navigator.deviceMemory` of at least 8 GiB. Missing or lower capacity selects one Worker. Each Worker mounts the same Blob through WORKERFS; the full input is never copied into page memory.

`--count` always means the whole sheet (12/24/48). With `--partition-count 2`, partition 0 owns even global sample indexes and partition 1 owns odd indexes. Each partial keeps full geometry. The app validates matching global metadata, dimensions, partition identity, finite timestamps, and exactly one owner for every sample. It copies owned rectangles into the first partial buffer and preserves the exact target/actual timestamps in global index order.

On parallel decoding, allocation, or validation failure, an AbortController synchronously terminates outstanding Workers. Every attempt settles before a single-Worker retry starts. The retry omits partition flags, so older cores remain usable. A failed single retry surfaces the error. No more than two WASM instances belong to a generation at any point.

The dependency must supply the partition contract before acceleration can succeed. The currently pinned v1.3.0 core lacks it and therefore retries in single-Worker mode on otherwise eligible devices. Development artifact injection stays outside production dependency resolution until a released Builder dependency is selected.

### Reproducible benchmark

The developer-only `window.VideoContactSheetBenchmark.workerCount` property accepts `null` (automatic), `1`, or `2` before Generate. It adds no user-facing setting and is not persisted. `lastRun` reports requested/final Workers, fallback reason, per-attempt timing, load/extraction/merge/render/total milliseconds, and allocated WASM bytes if available. Allocated WASM memory is the sum of final non-shrinking linear-memory sizes for that attempt; it is not whole-browser peak memory, JavaScript heap, input Blob storage, or OS RSS.

Use `tests/browser-benchmark.js` on a development artifact with the partition-capable core. Its function runs the same Blob at 12/24/48 frames in both orders, checks every RGB byte and metadata sample, and returns timings and memory values. Results are device/input-specific; no speed improvement is promised.

### Temporary Draft PR benchmark route

`tests/benchmark/` contains only source: visible UI, the Node assembly/verification utility, a reviewed expected-core hash record, and tests. No generated harness or FFmpeg payload is committed. The temporary preview workflow builds only the pinned Contact Sheet Builder profile, rejects raw JS/WASM bytes that differ from the independently verified official CI artifact, verifies the manifest and gzip roundtrip, and transfers five files through a same-workflow artifact. After the normal Windows repository build, the generator creates `dist/benchmark.html` and `dist/benchmark-identity.json`. Production build and deployment workflows do not invoke it.

The harness identifies this as a reproduced single-profile CI candidate and records the original verification artifact separately. Its visible controls run the same synthetic file in one/two Worker modes, alternate comparison order, display stage timings and allocated WASM memory, and provide PNG, metadata and measurement JSON downloads with pixel/metadata/PNG SHA-256 hashes. The temporary route and workflow job must be removed before the app PR becomes Ready.
