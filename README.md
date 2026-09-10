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

`npm run desktop:build` produces a `.deb` and `.rpm` under
`src-tauri/target/release/bundle/`; installing either one registers Plainleaf as a handler
for `.md`/`.markdown` files. (AppImage bundling currently fails at `linuxdeploy`.)

### Install from source on Linux

To run the built binary without making a package (for example under `~/.local`, no root):

```sh
npm run desktop:build   # or: npx tauri build --no-bundle
install -Dm755 src-tauri/target/release/plainleaf ~/.local/bin/plainleaf
for s in 32 128; do
  install -Dm644 "src-tauri/icons/${s}x${s}.png" \
    "$HOME/.local/share/icons/hicolor/${s}x${s}/apps/plainleaf.png"
done
cat > ~/.local/share/applications/plainleaf.desktop <<EOF
[Desktop Entry]
Type=Application
Name=Plainleaf
Comment=A quiet Markdown reader and editor
Exec=$HOME/.local/bin/plainleaf %F
Icon=plainleaf
Terminal=false
Categories=Office;Utility;TextEditor;
StartupWMClass=plainleaf
MimeType=text/markdown;text/x-markdown;
EOF
update-desktop-database ~/.local/share/applications
```

The `%F` field code is what passes a double-clicked file's path to the app. Opening a `.md`
file while Plainleaf is already running is routed into the existing window by the
single-instance plugin, through the same unsaved-changes prompt as the in-app Open command.

GTK file managers (Nautilus and friends) resolve `.md` to `text/markdown` and will open
Plainleaf. Some systems' `file(1)` reports `.md` as `text/plain`, so a bare terminal
`xdg-open note.md` may go to your `text/plain` handler instead; `gio open note.md` and the
file manager both work.

## Privacy and safety

Documents stay local. No accounts, database, telemetry, remote fonts, or automatic uploads. Markdown is sanitized and remote images are blocked. External web links require Cmd/Ctrl-click in the editable view; protected previews use a normal click. Source files remain unencrypted ordinary Markdown; use your operating system's disk protection for sensitive documents.

Custom file commands use native user selection and retain the approved path in Rust. No general filesystem or shell plugin is exposed. Save checks for external changes before replacing the selected file. Signing keys belong in secure release credentials, never this repository.

## Prototype limits

10 MB UTF-8 documents; one active document window; double-click / "Open with" file
association for `.md`/`.markdown` on macOS and Linux (Windows not yet), but no drag-and-drop
integration yet; no local images, autosave/recovery, or live file watcher. Find in Write depends on webview support. Source formatting inserts markup; Write formatting toggles structure. Link formatting currently inserts an example URL, which can be changed in Source.

Opening and switching views preserve the original Markdown. Actual edits in Write can normalize spacing, list markers, line endings and other equivalent Markdown syntax. Raw HTML, images, reference definitions, frontmatter, and content that fails a semantic round-trip check use a protected preview; edit those files in Source. This guard is conservative, not a proof of arbitrary Markdown compatibility. Each editor has its own undo history; a unified history and cross-mode selection mapping remain unfinished.

Cross-platform runtime testing and release signing remain outstanding. Use copies of important documents while evaluating this alpha. See `STATUS.md` for actual verification results.

License and distribution terms are undecided. No license grant is implied by this prototype.
