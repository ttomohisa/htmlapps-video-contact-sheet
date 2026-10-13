# Offline verification

1. Run `build-standalone.bat` while online once so the pinned Builder release can be downloaded and embedded.
2. Disconnect the machine from the network.
3. Open `video-contact-sheet.html` directly with `file://` or open `dist/index.html`.
4. Select an MP4/MOV/MKV/WebM file, choose 12 / 24 / 48 frames and an output resolution, and generate a contact sheet.
5. Confirm the image and timestamp CSV can be saved without reconnecting.
6. Change only timestamp visibility and generate again; confirm the image changes while the decoded frame times stay the same.
7. Start another generation and stop it; confirm the previous result is still visible and can be saved.

The generated HTML must contain a CSP with `connect-src 'none'` and no external script/style dependencies.

For a browser check, DevTools → Network should show no network requests from the app itself. Blob URLs used for the preview and Worker are local browser objects, not uploads.

## Ultra resolution checks

- Build with the pinned released Builder that supports integer thumbnail long edges from 96 through 960 px and a 25,000,000-pixel actual-output cap. Do not substitute an unreleased Builder artifact.
- Check both Japanese and English: Standard is initially selected; Light, Standard, High, and Ultra remain selectable. Ultra / 超高解像度 shows the PC-and-memory warning; High retains its previous warning. The generation summary and completed result source show the chosen mode. At 320–600 px viewport widths, the four controls occupy a readable two-by-two grid and the fixed page tabs still work.
- Generate Ultra sheets at 12 / 24 / 48 frames. Their thumbnail long edges must be 960 / 840 / 660 px, twice High. For square test video, full sheets must be 3840 × 2880 / 5040 × 3360 / 5280 × 3960. Compare saved PNG and JPEG dimensions with the result; viewer zoom must not change those dimensions or add a preview gutter.
- Inspect the processing log: Ultra must use one Worker, even on a device reporting at least 4 logical processors and 8 GiB. An Ultra failure must surface without a retry loop. Existing sizes at or below 640 px must retain the established one/two-Worker selection and parallel-failure fallback.
- After a successful result, choose another video and Ultra, then Stop. Confirm the previous image, source label, edited output filename, and timestamp CSV remain intact. Retry successfully, then change only timestamp visibility: rendering should use the same RGB cache without another extraction.
- Confirm an output above 25,000,000 pixels is rejected before output allocation in the Builder, and before Canvas allocation in the app. Valid 640 px / 48-frame / 15-column square geometry is 24,576,000 pixels and remains within the cap; do not reject by assuming every requested thumbnail is square before source geometry is known.

The largest built-in Ultra sheet has 20,908,800 pixels. Its RGB payload is 62,726,400 bytes and one RGBA surface is 83,635,200 bytes. The general 25M cap permits at most 75,000,000 RGB bytes and 100,000,000 bytes per RGBA surface. These numbers exclude WASM, decoder and temporary buffers, the retained prior result, browser/preview copies, and PNG/JPEG encoding; they are not a guarantee of peak memory or phone compatibility.

Source regression commands: `node --test tests/*.test.cjs` and, with the existing native Canvas dependency available, `CONTACT_SHEET_REAL_CANVAS=1 node --test tests/*.test.cjs`. The native suite verifies the maximum built-in Ultra square output, actual PNG dimensions, and cache reuse. Run `scripts/check-repository.ps1` on the integrated dependency before publishing, then repeat the offline browser checks against the built standalone file.
