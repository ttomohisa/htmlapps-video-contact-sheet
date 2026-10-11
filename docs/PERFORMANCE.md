# Contact Sheet worker performance verification

Status: the main synthetic benchmark, rotated-fixture pixels/metadata/PNG parity, exact rotated sample metadata, and same-page recovery after invalid input are verified.

## Scope and environment

This is one synthetic cloud-browser result, measured on 2026-10-11 UTC. The 19-row measurement export was saved at 03:58:45 UTC; individual run wall-clock timestamps were not recorded. The exact browser version was not captured.

- Browser-reported capacity: `hardwareConcurrency = 9`, `deviceMemory = 8` GiB. These are reported capability values, not a measurement of free RAM.
- App version: `1.0.6`.
- App benchmark commit: [`aa425d950736617d3b02f75ba7c3dc606b16d40e`](https://github.com/ttomohisa/htmlapps-video-contact-sheet/commit/aa425d950736617d3b02f75ba7c3dc606b16d40e).
- App preview workflow: [38108752188](https://github.com/ttomohisa/htmlapps-video-contact-sheet/actions/runs/38108752188).
- Builder source commit: [`d88553dc610a82e285db125e31f1655d324cec6c`](https://github.com/ttomohisa/htmlapps-ffmpeg-wasm-builder/commit/d88553dc610a82e285db125e31f1655d324cec6c).
- Provenance: a reproduced single-profile CI build. The workflow required the raw JavaScript and WASM bytes to match the separately verified official Builder CI artifact. This was a test-only candidate, not a dependency-release claim.

Fixture: `contact-720p-long-gop.mp4`, synthetic H.264, 1280×720, 30 fps, 12.000 seconds, 2,933,492 bytes. Fixture SHA-256:

`06563cb8e808c87477549009dc86d3c62252ad91a4333a72412637ae3e8340a2`

Measurement export SHA-256: `5efcbfb634cd0bc347969115ee61a38218313b1276ffd23d815b547ad3fc4d70`.

## Method

One preliminary cold-asset-load run used one Worker at 12 frames. Each of 12, 24, and 48 frames then had three warm runs per mode. Pair order alternated `(1, 2)`, `(2, 1)`, `(1, 2)` for every frame count. The same selected file was used throughout, and every requested mode was actually used without fallback.

Warm runs reused decoded JS/WASM assets; every extraction still created fresh Workers and fresh single-thread WASM instances. “Total” includes asset preparation, extraction, merge, and Canvas rendering. Hashing and PNG encoding are excluded from the timing. Cold runs are excluded from warm medians. Results were grouped by fixture name, bytes, last-modified identity, frame count, build identity, and reported capacity; no exclusions or duplicate records were present.

## Warm medians

Every row has `n = 3` for each actual mode. Times are milliseconds.

| Frames | Total, 1 Worker | Total, 2 Workers | Extraction, 1 Worker | Extraction, 2 Workers | Total ratio, 1/2 | Total time reduction |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 12 | 2,953.1 | 1,980.5 | 2,949.1 | 1,971.7 | 1.491× | 32.935% |
| 24 | 5,818.3 | 3,386.8 | 5,807.9 | 3,373.3 | 1.718× | 41.791% |
| 48 | 11,552.4 | 6,205.9 | 11,526.7 | 6,196.1 | 1.862× | 46.280% |

Ratio is the one-Worker median divided by the two-Worker median. Reduction is `1 − (two-Worker median / one-Worker median)`. These observations do not establish a general speed improvement, mobile performance, or a guarantee for other devices, codecs, resolutions, or seek patterns.

## Memory

For every tested count and every run, allocated WASM linear memory was:

- One Worker: 73,793,536 bytes, or **70.375 MiB**.
- Two Workers combined: 147,587,072 bytes, or **140.750 MiB**.
- The measured allocated-WASM amount therefore doubled exactly.

This is the sum of final, non-shrinking WASM linear-memory sizes for the attempt. It is **not whole-browser peak memory**, JavaScript heap, Blob storage, GPU memory, or OS RSS. Browser peak memory was not measured. The production capacity gate and single-Worker fallback remain important.

## Cold runs, reported separately

The main fixture also had one cold-asset-load run for each actual mode at 12 frames. These are isolated `n = 1` observations, taken separately rather than a repeated cold benchmark; they are excluded from all warm medians.

| Actual mode | Total | Extraction | Allocated WASM |
| --- | ---: | ---: | ---: |
| 1 Worker | 2,994.6 ms | 2,957.8 ms | 70.375 MiB |
| 2 Workers | 1,958.1 ms | 1,919.6 ms | 140.750 MiB |

Both runs completed without fallback. The additional cold two-Worker result matched the raw-pixel, metadata, and PNG hashes of every previous 12-frame main-fixture result. No generalized cold-start speed ratio is claimed from one sample per mode.

## Output parity

All runs at each count, including the cold 12-frame run, had matching raw RGB-pixel, canonical metadata, and exported PNG SHA-256 values across both modes. Metadata includes the stored global sample indexes and target/actual timestamps. No fallback occurred in these 19 rows.

### 12 frames

- Raw pixels: `d3919b85a9bf0aec3ec0c6d1dd1fe1cef509e5368aa7061688a07ad96e3a89bb`
- Canonical metadata: `d1048aa07e3a49951490894afa640e67d4f7d7384fda154f135fb1c2ad15139e`
- Exported PNG: `82a2e7def0cf380ca0c40ba59eff3658877d4e1a87d13288ed6b4a2ace8af80a`

### 24 frames

- Raw pixels: `0e6f07c275ca02b24883d6df035ada7cb1766870f5d109443062a94c371c8715`
- Canonical metadata: `880fad19c0e5e7c56e7bdc2070067b9fd0ab35ecc61cf7cc7752f983049327c0`
- Exported PNG: `6c1eb9bb7c7f09618954960039f5d7ecec7f54a5fad4b85232042daa56dcb7c7`

### 48 frames

- Raw pixels: `2431e6b9ff71412352bcee99b0ec04f8d318c0d1f84c340636485c1c5ca39a83`
- Canonical metadata: `6404fc30c6b4bf7fc6c70f10a1c94c0915994762932f66483642ce3b076ceb54`
- Exported PNG: `4df222f33b208c96cbaf890b9884ee0f7abd3df982765df4ce009ceee3ac507a`

## Core artifact identity

The official verification baseline was Builder workflow [38107231716](https://github.com/ttomohisa/htmlapps-ffmpeg-wasm-builder/actions/runs/38107231716), artifact `11689618675`, with CI merge commit `1d70d6b249bd048065f667a6d3b2c5febb6f0808` and artifact ZIP SHA-256 `13c7e4b7b096b015106bacff0b51a754ac71e804c9a172cc3e4b9e372361ce30`.

Raw cores matched that baseline exactly:

- `ffmpeg.js`: 68,493 bytes; SHA-256 `0b0e79dffbdfbdc449a4b5c74a60092c5b9dd75e8257e153b5840ce6f4856c42`.
- `ffmpeg.wasm`: 2,467,841 bytes; SHA-256 `d30ee16310c4957e62b458984b4e8c3b63019800117b980ee9444a08341ef129`.

The app-workflow rebuild used compressed payload hashes `e8cda6dbff3c365e7bdfbc6806b5978c2f6dd6592e4252784e7885850f90f79e` for JS gzip and `2503af1236f020afca85866224160d2de62ae760700797a36bb9096687adaa85` for WASM gzip. Gzip wrapper bytes can differ between builds; decompressed core hashes and gzip roundtrip were verified.

## Rotation correctness

A separate synthetic fixture, `contact-720p-rotated.mp4`, carries a 90-degree display-rotation flag. It has 2,933,492 bytes and SHA-256 `d118680520cdc76942f26d388c67ee3b4da97ccf78fd6789173df39a4bfcd221`.

Two 24-frame runs used the same selected rotated file, with one Worker and then two Workers. The first had a cold asset load and the second was warm, so **no performance comparison is made**. Both actual modes matched the requested modes and neither used fallback. Raw pixels, canonical metadata, and PNG hashes matched across the pair. The downloaded PNG was independently checked as 948×1120 pixels; browser inspection showed a 6×4 grid of portrait cells.

- Raw pixels: `6ba0d8746867296feb3017392560c74c0e347517489cb4670eca9e21f05f4599`.
- Canonical metadata: `6f5a9522d7d5a3ad5a71181f153c94d5a9db5e57e0fc7bdedf9e4aa41f1e475a`.
- PNG, also verified from the downloaded file: `963705867244021c643ed4bc1552e11880ad2abcaf2f05db8422f7809a8516ba`.

The downloaded output metadata was inspected independently. It reports `rotationDegrees = 90`, 6 columns × 4 rows, 158×280-pixel cells, and a 948×1120-pixel sheet. Samples are the complete ordered global indexes 0 through 23, with no partition markers left in the merged result. Its canonical SHA-256, `6f5a9522d7d5a3ad5a71181f153c94d5a9db5e57e0fc7bdedf9e4aa41f1e475a`, matches both measured modes.

Every target matched the original rounded-microsecond calculation `av_rescale(12000000, i, 23)`, with the last target clamped to 11.999 seconds. For this 30 fps fixture, every actual timestamp matched the first frame at or after its target, except the end-of-clip target which used the last available frame, `359/30` seconds = 11.966667 seconds at the stored six-decimal precision.

## Invalid input and same-page recovery

Browser observation: selecting the synthetic 55-byte `contact-invalid.mp4` and requesting two Workers produced a visible `FAILED` message with runner exit code 1 / invalid input data. No successful measurement row was produced for that failed operation. The invalid fixture SHA-256 is `47115c90c3239b71b6c28e7d203cdab2a4eff9d91cdd6829c03d57cf702d16a5`.

Without reloading the page, the browser then processed `contact-small.mp4` successfully with two actual Workers and no fallback. The successful recovery is present in the exported measurements; the invalid-input error itself is a browser-observed result, not a successful JSON record.

The recovery fixture is synthetic H.264, 320×180, 12 fps, 2 seconds, 30,983 bytes, SHA-256 `7d5913a91a23b01fd743fef5a62c60e3d4a72a56dab4eba401b3a350cd754034`.

The single recovery run used 12 frames and took **133.4 ms total**, **114.3 ms extraction**, with **140.750 MiB allocated WASM**. It was not a one-versus-two comparison and is not included in main-fixture medians. Its output hashes are recorded evidence, not a parity claim:

- Raw pixels: `2b51a3c0924e779ba3bbf89d07b1225407b3e7e8bda03731b69116cd4b5360f6`.
- Canonical metadata: `fe939b9a1e5ca7a036edfd24eedbdaed2b975364deda9e430f92cf6fcc844a8d`.
- PNG: `3945ee5eebdb9395060438cc483316f967664bee6504edd67546cc520575598c`.

## Existing released-core path

A separate browser check of the ordinary app with the previously pinned Builder v1.3.0 core completed generation and PNG/CSV export. Its 12-frame PNG SHA-256 was `82a2e7def0cf380ca0c40ba59eff3658877d4e1a87d13288ed6b4a2ace8af80a`, exactly matching the new-core main-fixture 12-frame PNG. The exported CSV contained 12 valid, ordered timestamps.

The successful-operation Processing log was hidden in that earlier build, so actual old-core fallback was **not directly observed**. Ordinary generation/export success and automated fallback/lifecycle coverage are separate evidence. Final source makes the existing localized Processing log summary visible but collapsed after successful generation, allowing the actual Worker count to be inspected.
