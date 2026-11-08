# Impeccable design review — Video Contact Sheet

## Why this pass was needed

The earlier PR revisions still looked like landing pages: a dark marketing-style hero, large empty preview surfaces, and repeated captions. Even the subsequent light editing layout left most of the desktop empty before a file existed, and centered a small phone picker in a vacant full screen. Automated design lint passing did not prove that those screens were useful.

## The resulting task layout

- **Desktop before file selection:** a compact, white two-column setup (video picker + Create action / frames + resolution + timestamps). There is deliberately no empty preview pane yet, and no promotional hero.
- **Desktop with a video:** the full editor opens, with a 338px left settings rail and a right preview. When a real contact sheet is generated, the preview is shown at its natural aspect ratio, followed immediately by filename, PNG/JPEG, Save, Regenerate and CSV. The result pane no longer extends into a large blank gray tail below the exports.
- **Phone initial screen:** an ordinary heading, concise local-processing statement and a full-width file-select button near the top. There is no unnecessary mobile drag/drop decoration. Selecting a file advances directly to the Frames tab.
- **Phone result:** uncropped actual contact sheet; compact, unboxed output metadata; white space below exports rather than a gray unfilled panel. Safe-area-aware four-tab navigation is retained.
- **Completed job:** the completion status remains visible, but the 100%-full progress bar is hidden; the processing log stays available on demand.
- **UI copy:** the Japanese primary action is now 「コマ一覧を作成」 instead of the technical 「コンタクトシートを生成」. The Japanese and English empty-result messages now describe the next action rather than telling someone who already selected a file to select it again.

The single stylesheet was refactored within the existing source. There are no fabricated sample frames, decorative textures, added runtime dependencies or external network calls. Existing image processing, source preview, four output resolutions, cancellation, previous-result handling, help and license details remain intact.

## What Impeccable actually ran

The PR installs official Impeccable skill 4.8.1, invokes its verified 0.1.19 engine in GitHub Actions, and runs `context`, `concept-seed --scope direction --mode operate`, and `detect --json`. The references inform the design, but the rendered interface was separately reviewed by a human. Neither an interactive Impeccable direction-choice page nor a live overlay nor dual-agent critique was executed.

An earlier follow-up scan flagged the zero inset on the borderless mobile chooser wrapper. That wrapper now has padding on all four sides, without reintroducing a decorated drop zone. **Use the detector artifact of the current PR head for the authoritative final finding count**; a green workflow result alone does not guarantee zero findings because advisory issues do not fail that workflow. The context command also reports the pre-existing legacy `PRODUCT.md` format.

## Real browser and media verification

Verified against generated **standalone HTML artifacts**, not a mockup, in headless Chromium:

- Initial state at 1440×900, 768×1024, 390×844 and 320×700, including horizontal document overflow and page JavaScript errors.
- Japanese at desktop and 390px/320px phones; English at desktop and 390px phone.
- Real local 3-second H.264 MP4 file selection and 12-frame, 1280×540 image generation on desktop and 390px phone; the Japanese phone flow was also verified at 320px.
- Actual PNG, JPEG and timestamp CSV downloads, with correct filenames; zoom open/close. Verified the phone auto-advance to Frames after file selection.
- No external HTTP(S) requests observed during those monitored browser runs.

## Not yet release-verified

Physical phone touch testing, very large files and constrained memory, other codecs/containers, HDR color accuracy and cross-browser behavior remain to be checked. The README screenshots have not been refreshed. Keep this PR Draft until visual acceptance and the release review are complete.
