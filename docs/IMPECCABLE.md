# Impeccable in this repository

Impeccable is a development-time design skill, **not a runtime dependency** of Video Contact Sheet.

- Upstream: https://github.com/pbakaus/impeccable
- Pinned upstream commit: `924bbd194d02e5e15a227e75b5901fb0d7a4ecad` (skill 4.8.1)
- License: Apache-2.0; license copy in `.agents/skills/impeccable/LICENSE`.
- Installation: complete upstream Codex skill tree copied into `.agents/skills/impeccable/` from that commit. This follows upstream's documented manual installation alternative to `npx impeccable install`.
- Context for this project: `PRODUCT.md`, `DESIGN.md` and `.impeccable/config.json`.

In Codex CLI, open the project directory and invoke `$impeccable`, e.g. `$impeccable critique src/index.template.html` or `$impeccable adapt src/index.template.html`. An engine binary may be fetched on the first use of the launcher in a development environment.

The design detector is **not enabled as an automatic hook** by this manual installation. No hook bypasses approval; locally review and enable the Codex hook before relying on it. The PR has a dedicated `Impeccable design review` GitHub Actions workflow: it invokes the pinned official engine for `context`, `concept-seed --scope direction --mode operate`, and `detect --json`, preserving the detector report as an artifact. The automated detector is distinct from the human visual critique; the latter requires rendered desktop/mobile checks. To run a manual design scan on a development machine with the prerequisites available:

```sh
npx impeccable detect src/
```

This installed skill and its tooling are **not bundled into standalone HTML**; they do not affect the app's no-network runtime policy.

If updating later, inspect upstream changes and license before replacing the pinned files, and keep PRODUCT.md/DESIGN.md as repository-owned context.