# Architecture

```text
Repository build time
  dependencies.json (Builder v1.10.4 pinned)
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

The pinned Builder v1.10.4 Contact Sheet profile supplies the compatible partition contract. Capable devices may use two Workers; lower or unknown capacity selects one. Runtime decoding, allocation, or validation failures still use the bounded single-Worker fallback described above. Production resolves only the checksum-verified release dependency; benchmark candidate injection is separate.

### Manual regression benchmark

The production Generate action always uses capacity-based selection. It exposes no global Worker override or last-run benchmark object. Its technical log reports actual Worker count, extraction/merge timing, and allocated WASM bytes if available. Successful generation reveals the existing localized Processing log summary in a collapsed state. Allocated WASM memory is the sum of final non-shrinking linear-memory sizes for that attempt; it is not whole-browser peak memory, JavaScript heap, input Blob storage, or OS RSS.

`tests/benchmark/` contains only manual regression source: a visible UI, Node assembly/verification utility, reviewed expected-core hashes, and tests. No generated harness or FFmpeg payload is committed. The generator verifies candidate profile/capabilities, exact raw JS/WASM hashes, and gzip roundtrip, then checks the normal built app against its source template. It can produce a local `dist/benchmark.html` with mode controls, alternating same-file comparisons, stage timings, allocated WASM measurements, and PNG/metadata/measurement downloads. Raw pixels, metadata, and PNG SHA-256 values must all match.

The temporary public Draft-PR benchmark route and dependency-build job have been removed. Preview, production build, and deployment workflows do not invoke the manual generator. Benchmark timing remains device/input-specific; no general speed improvement is promised.
