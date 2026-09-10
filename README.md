# Plainleaf

A quiet Markdown reader and editor for macOS, Windows, and Linux.

**Local prototype — not a signed public release.** Editable Write/Source modes, modern system sans-serif typography, light/dark/system themes, native open/save dialogs, atomic saves, and unsaved-change protection.

## Develop

Install Node.js 24+ and a stable Rust toolchain, plus the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform.

```sh
npm ci
npm run desktop
```

Install Gitleaks and enable the repository's secret-check hooks with `git config core.hooksPath .githooks` before committing. The hooks scan staged content before commits and all history before pushes. Never bypass them to publish.

`npm run dev` opens the browser preview. Browser saves download a copy; the desktop build saves directly through native dialogs. No API keys or `.env` files are required.

## Check and build

```sh
npm run verify
cargo test --manifest-path src-tauri/Cargo.toml
npm run desktop:build
```

## Privacy and safety

Documents stay local. No accounts, database, telemetry, remote fonts, or automatic uploads. Markdown is sanitized and remote images are blocked. External web links require Cmd/Ctrl-click in the editable view; protected previews use a normal click. Source files remain unencrypted ordinary Markdown; use your operating system's disk protection for sensitive documents.

Custom file commands use native user selection and retain the approved path in Rust. No general filesystem or shell plugin is exposed. Save checks for external changes before replacing the selected file. Signing keys belong in secure release credentials, never this repository.

## Prototype limits

10 MB UTF-8 documents; one active document window; no file association or drop integration yet; no local images, autosave/recovery, or live file watcher. Find in Write depends on webview support. Source formatting inserts markup; Write formatting toggles structure. Link formatting currently inserts an example URL, which can be changed in Source.

Opening and switching views preserve the original Markdown. Actual edits in Write can normalize spacing, list markers, line endings and other equivalent Markdown syntax. Raw HTML, images, reference definitions, frontmatter, and content that fails a semantic round-trip check use a protected preview; edit those files in Source. This guard is conservative, not a proof of arbitrary Markdown compatibility. Each editor has its own undo history; a unified history and cross-mode selection mapping remain unfinished.

Cross-platform runtime testing and release signing remain outstanding. Use copies of important documents while evaluating this alpha. See `STATUS.md` for actual verification results.

License and distribution terms are undecided. No license grant is implied by this prototype.
