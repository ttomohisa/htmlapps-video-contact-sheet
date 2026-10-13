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
