# Plainleaf status

## Active work — September 10 Linux file-open and build

Brought the Linux build to parity with the macOS Finder file-open behaviour, and verified it
directly on Sean's Omarchy/Hyprland machine (full toolchain present: Node 26.7, Rust 1.98.1,
webkit2gtk-4.1, gitleaks 8.x, live `wayland-1` session).

**Why it was needed:** Tauri's `RunEvent::Opened` is macOS/iOS/Android-only, so Linux had no
code path from an opened file to a loaded document. Separately, the Tauri Linux bundler
writes `Exec=plainleaf` with no `%F` field code, so even a correct MIME association never
passed the file path to the app.

Rust (`src-tauri/`):
- `Cargo.toml` adds `tauri-plugin-single-instance` 2.4.4 under a `cfg(target_os = "linux")`
  target table only. macOS keeps its existing `RunEvent::Opened` path unchanged; Windows is
  untouched (still no open-event handling).
- `main.rs`: the macOS open handler's body is now a shared `stage_incoming(app, &Path)` that
  validates the file with the same `validate_incoming` rules as the in-app Open command and
  only *stages* it in `OpenState` — the active `Document` is never touched here. New pure
  helper `first_file_arg(args)` pulls the file path out of an argv list (skips argv0 and
  `-…` flags, first path wins). In `.setup()`, Linux-only: the single-instance plugin is
  registered first, its callback routes a second launch's argv through `stage_incoming` and
  focuses the `main` window; then this process's own `std::env::args_os()` is checked once
  for the cold-launch case. Everything downstream — the `open-requested` /
  `open-request-failed` events, `take_pending_open` / `accept_pending_open` /
  `reject_pending_open`, and the frontend Save/Discard/Cancel prompt — is unchanged and
  already platform-agnostic. No frontend code changed.
- 2 new Rust unit tests for `first_file_arg` (skips program name + flags; `None` with no
  path). Rust test count: 15.

Packaging:
- `src-tauri/linux/plainleaf.desktop` — a custom Handlebars desktop template with
  `Exec={{exec}} %F` and `MimeType=text/markdown;text/x-markdown;`.
- `tauri.conf.json` — `bundle.linux.deb.desktopTemplate` and `bundle.linux.rpm.desktopTemplate`
  both point at it. Confirmed the generated `.deb`/`.rpm` `.desktop` now carries
  `Exec=plainleaf %F` and the MimeType. AppImage has no template override in Tauri and also
  still fails to bundle at `linuxdeploy` (pre-existing, unchanged by this work).
- `README.md` documents the from-source `~/.local` install (binary + `.desktop` with `%F` +
  icons + `update-desktop-database`); no install script is committed.

**Verified in this session (run for real, not simulated):**
- `npm run verify` — svelte-check 0/0, 25 frontend tests, build, working-tree secret scan: pass.
- `cargo test --manifest-path src-tauri/Cargo.toml` — 15 pass.
- `cargo build --release` — no warnings.
- `npx tauri build` — `.deb` and `.rpm` bundled; generated `.desktop` verified. AppImage
  fails at `linuxdeploy` as before.
- `gitleaks git --redact --log-opts=--all` (full history) — clean.
- Ran the release binary on the live Hyprland session (disposable fixtures only):
  - Bare launch: window opens, editor renders, dark theme, toolbar (document + formatting
    groups) present.
  - Cold launch `plainleaf cold.md`: opens with the file's rendered content and title
    "cold.md — Plainleaf", clean state — not a blank Untitled document.
  - Second instance: with `cold.md` open, `plainleaf second.md` exited immediately (code 0),
    no second window; the existing window switched to `second.md` and was focused.
  - `gio open note.md` (the path Nautilus and other GTK file managers use): launches
    Plainleaf with the file.
  - The dirty-document Save/Discard/Cancel prompt and the invalid-external-file error path
    were exercised through the frontend unit tests (`src/App.test.ts` "native external file
    open": Cancel preserves the draft, Discard loads the new file, pre-listener pickup,
    rejected file reported without touching the document), not re-clicked live — this
    session's Wayland setup had no reliable way to inject a click/keystroke into the
    webview, and that path is platform-agnostic frontend logic fed by the same
    `open-requested` / `accept_pending_open` / `reject_pending_open` contract the live
    second-instance test above exercised.

**MIME-type detection caveat (observed, not a regression):** on this Arch system `file(1)`
reports `.md` as `text/plain`, while shared-mime-info / `gio` report `text/markdown`. GTK
file managers (Nautilus is what's installed) resolve `.md` correctly and open Plainleaf.
Terminal `xdg-open note.md` uses `file(1)` and so may route `.md` to the `text/plain`
handler instead. The custom `.desktop` (deb/rpm and the `~/.local` install) declares
`text/markdown;text/x-markdown;`; making Plainleaf the `text/plain` handler would be too
greedy and was not done.

Sean's existing `~/.local` install from Sept 9 was refreshed to this build: the binary at
`~/.local/bin/plainleaf` and `~/.local/share/applications/plainleaf.desktop` now use
`Exec=… %F` (was `%U`) and `MimeType=text/markdown;text/x-markdown;`.

## Active work — September 10 icon, dark mode, and toolbar redesign

Three visual changes, approved by Sean against a mocked-up preview before any code changed:

1. **App icon** (`assets/icon.svg`): background and the leaf shape's own fill move from off-white (`#f1f0e8`) to near-black (`#0e0e0e`); the leaf outline and vein-line stroke stay the exact same green (`#496d43`) they already were. The leaf now reads as a green outline on a dark tile. The platform icon set under `src-tauri/icons/` (icon.icns, icon.ico, the PNG sizes) still needs to be regenerated from this SVG via `npx tauri icon assets/icon.svg` -- that command needs the native Tauri CLI binary, which this session's Linux sandbox doesn't have (same limitation noted below for the test runner), so it has to run on Sean's Mac as part of the verify script.
2. **Dark mode palette** (`src/style.css`, `.app.dark`): every neutral token (`--paper`, `--panel`, `--ink`, `--muted`, `--line`, `--hover`, `--selection`) was tinted slightly green because it was derived from the accent instead of kept neutral. Replaced with true neutral "space gray" values (`--paper: #1c1c1e`, `--panel: #242426`, `--ink: #ececec`, `--muted: #98989c`, `--line: #323234`, `--hover: #2a2a2d`, `--selection: #33452e`). `--accent` (`#b0cd97`) is untouched, in light mode too.
3. **Toolbar** (`src/App.svelte`, `src/Icon.svelte`, `src/style.css`): New, Open, Save, and Save As move out of the `•••` "Document options" popover (removed entirely) and the narrow-window hamburger menu's `compact-documents` section (also removed), and become their own always-visible icon buttons -- a new `.document-tools` group at the start of the header, styled like the formatting buttons, separated by a thin divider. Four new stroke icons were added to `Icon.svelte` (`new`, `open`, `save`, `save-as` -- Save As carries a small corner badge so it reads differently from Save at toolbar size). The hamburger menu (`header-overflow`) now only holds appearance-related settings (theme, writing size, mode, toolbar display), as requested. The `menu` state variable and every reference to it were removed along with the popover it controlled.

Added one new frontend test asserting the four document actions are visible without opening any menu, and updated three existing tests (writing-size, compact-header-menu, new-document) that referenced the removed `•••` popover or its old button text.

**Verification status:** `npx svelte-check` passes with 0 errors/0 warnings and the working-tree secret scan passes, both run directly in this session against the real project. `npm test`, `npm run build`, `cargo test`, the Tauri icon regeneration, the debug rebuild, and the full-history secret scan all still need the real toolchain and have to run on Sean's Mac via the verify-and-publish script, the same as the previous fix.

## Verified September 10, 2026 -- automated design-update script run

Ran on Seans Mac via the automated verify-and-publish script (not simulated):
- npx tauri icon assets/icon.svg: regenerated the full platform icon set from the new black-and-green design.
- npm run verify (typecheck, frontend tests, build, working-tree secret scan): passed.
- cargo test --manifest-path src-tauri/Cargo.toml: passed.
- gitleaks git --redact --log-opts=--all (full history): passed, no secrets found.
- npx tauri build --debug: succeeded, app built at src-tauri/target/debug/bundle/macos/Plainleaf.app.
- Confirmed the built app still lists Markdown as an openable file type.
- Visually confirming the new icon in the Dock/Finder and the new dark mode/toolbar on screen was not part of this automated run and remains optional, for whenever Sean wants to look.
## Active work — September 10 Finder file-open fix

Fixed the bug reported in this session's handoff: double-clicking a `.md`/`.markdown` file in Finder (or "Open With", or dragging it onto the Dock icon) launched Plainleaf with a blank Untitled document instead of the file's content, for both a cold launch and an already-running instance. File reading itself was already correct (the in-app Open command worked); the missing piece was native file-association/open-event handling, exactly as the handoff diagnosed.

Rust (`src-tauri/`): `tauri.conf.json` now declares `.md`/`.markdown` under `bundle.fileAssociations` (verified against this project's own pinned `@tauri-apps/cli` config schema rather than guessed). `main.rs` adds an `OpenState` that stages a file handed in from macOS -- validated with the exact same rules as the in-app Open command (canonicalize, extension check, size/UTF-8/regular-file checks) -- behind an incrementing request id, and never touches the active `Document` until the frontend's existing Save/Discard/Cancel prompt is resolved in its favor. New commands: `take_pending_open` (idempotent, so calling it both from the cold-launch mount check and from the `open-requested` listener is safe), `accept_pending_open` (promotes the staged file; rejects a stale/mismatched id without side effects), `reject_pending_open` (clears it on Cancel). `RunEvent::Opened` handling is macOS-only (`#[cfg(target_os = "macos")]`); only the first url of a multi-file event is used, per the handoff's instruction not to silently overwrite a succession of documents. No new Tauri capabilities/permissions were added.

Frontend (`src/App.svelte`): listens for `open-requested` / `open-request-failed`, and reuses the existing `permit()` Save/Discard/Cancel dialog before loading the incoming file via `reset()`.

Added 5 new Rust unit tests (claim-once semantics, replacing an unclaimed candidate, promotion into the active document, stale-id rejection, reject-without-side-effects) and 4 new frontend tests (Cancel preserves the draft; Discard loads the new file; a file that arrived before the listener existed is still picked up; an invalid external file reports an error without touching the document).

Windows/Linux are intentionally untouched -- `RunEvent::Opened` handling is macOS-only, so those platforms still lack open-event handling exactly as before. One honest caveat: `bundle.fileAssociations` is cross-platform config (Tauri's schema has no macOS-only variant), so a future Windows/Linux build would register the `.md`/`.markdown` association at the OS level without yet being able to act on it. Flagging this now rather than leaving it to be discovered later.

**Verification status: partially executed in this session; the rest was implemented and carefully reviewed against the pinned Tauri 2.11 API/schema but not run.** This session had no way to run `npm test` or `npm run build` (the installed Vite/Vitest now depend on a native `rolldown` binary that has no build for this session's environment) or anything Rust (no Cargo/rustc reachable anywhere this session could execute commands, and this account's network policy blocks package registries -- npm, crates.io, PyPI -- so no substitute toolchain could be installed either; screen/keyboard control for Terminal is also restricted to view-and-click only, no typing, as a safety measure). What *could* run directly against this checkout, using tools with no native-binary dependency, did run and passed: `npx svelte-check --tsconfig ./tsconfig.json` (the exact command behind `npm run check`) -- 0 errors, 0 warnings, after fixing one real type error it caught in the new test mocks -- and `node scripts/scan-secrets.mjs` (the working-tree half of `npm run scan:secrets`), which also passed. Rust compiles and tests, `npm test`, `npm run build`, the macOS rebuild, the manual Finder checklist, and the full-history `gitleaks` scan are all still outstanding. The change is committed locally on this machine and intentionally not pushed, so nothing unverified reached the public repo. Next, whenever convenient: `cargo test --manifest-path src-tauri/Cargo.toml`, `npm test`, `npm run build`, `npx tauri build --debug`, the manual Finder checklist in `docs/qa.md`, `gitleaks git --redact --log-opts=--all`, then `git push`.

## Verified September 10, 2026 -- automated script run

Ran on Seans Mac via the automated verify-and-publish script (not simulated):
- `npm run verify` (typecheck, frontend tests, build, working-tree secret scan): passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed.
- `gitleaks git --redact --log-opts=--all` (full history): passed, no secrets found.
- `npx tauri build --debug`: succeeded, app built at `src-tauri/target/debug/bundle/macos/Plainleaf.app`.
- Confirmed the built app Info.plist actually declares Markdown as an openable file type.
- Manual Finder double-click / drag-onto-icon testing (see docs/qa.md checklist) was not part of this automated run and remains optional, for whenever Sean wants to try it himself.
## Active work — September 10 native file-safety pass

The user closed the unsaved draft, so disposable manual native testing may resume after rebuilding. External-change comparison now has direct coverage for unchanged, externally changed, and missing original files; rejected saves are proven not to overwrite disk content. Rust tests pass (7), and frontend verification passes (19 tests, zero diagnostics, build and working-tree secret scan). Manual Save As/reopen/cancel/close/quit and external-change UI checks remain. Use only disposable fixtures and stop if an unexpected user draft appears. Sol low is appropriate; recommend Sol medium only if tests expose a nontrivial cross-platform bug.

September 10 heading follow-up: the former single Heading command is now three explicit H1, H2, and H3 controls in Write and Source. In Source, changing a selected heading replaces an existing Markdown heading prefix instead of stacking another prefix. Keep this narrow behavior and the approved toolbar design intact.

September 10 responsive-header follow-up: below 1050px, formatting remains in one non-wrapping row and the remaining header controls collapse into one minimalist dropdown. The dropdown contains appearance, writing size, Write/Source, toolbar display, and document actions. At very narrow widths the formatting row scrolls horizontally with its scrollbar hidden. Browser inspection confirmed the single-row layout and dropdown at the current half-window viewport; no document content was changed.

## Approved — September 10 design pass

Sean approved the redesigned interface. This pass is complete and ready for its Git checkpoint. Next functional milestone: verify native Save/Save As/reopen, cancellation, unsaved close/quit, and refusal to overwrite externally modified files using disposable fixtures. Then address cross-mode undo/selection, followed by release packaging. Keep the approved visual design as the baseline.

User authorized this UI redesign. Resume here if interrupted; inspect git diff before changing anything. Do not repeat completed work or replace user changes.

Scope: widen both writing columns (narrower side margins); remove header/footer divider lines; remove in-app logo and duplicate centered filename while retaining the native window title; keep Write/Source; restrict the three-dot menu to New/Open/Save/Save As; expose formatting, Light/Dark/System, and writing-size controls directly in the header. Add a separate Settings control with persisted toolbar display choices: icons only (default), icons + labels, labels only. Use local SVG icons, accessible names and tooltips. Preserve blank startup, hidden scrollbars, 18px default and 14–64px size range, source preservation, keyboard shortcuts and file safety.

Plan: (1) record handoff — done; (2) inspect current UI and implement toolbar + shared wider page padding; (3) verify formatting selection, themes, persisted display settings, document-only menu and narrow-window wrapping; (4) run npm run verify and required Rust tests; (5) rebuild the Mac prototype, record results and provide a review artifact. Do not terminate a running app that may hold a draft. No release workflow or unrelated editor/storage changes in this pass.

Current progress: UI implementation complete. App.svelte exposes all formatting/theme/size controls and a separate Settings popover; Icon.svelte supplies local SVGs. Toolbar display preference is validated and persisted locally. Header/footer rules removed; logo and duplicate title removed. Shared page gutter is clamp(24px, 8vw, 160px) in Write and Source. Mouse formatting preserves selection. Document menu contains only New/Open/Save/Save As. No changes to Rust/file-saving behavior.

Verification: npm run verify passes (18 frontend tests; zero Svelte diagnostics; build and working-tree secret-pattern check pass). Browser checks passed for selected-text formatting in both editors, light/dark appearance, all display modes, document-only menu, and wrapping at 520px. Native build and Rust test results will be recorded below. Existing Vite large-chunk warning remains. Next: review the rebuilt app with Sean; continue from his next design feedback. Do not reimplement this pass.

Final verification: 4 Rust tests pass; updated Apple Silicon Mac debug app successfully bundled. Include src/Icon.svelte in the design checkpoint. A review zip was produced in this task's outputs as Plainleaf-macOS-arm64-toolbar.zip. The previously running native app was not closed; save any draft before reopening the rebuilt app. No implementation steps remain for this design request.

Linux handoff (reported by Claude, September 9): commit d7d46b0 compiled on Arch Linux/Wayland and the binary launched and exited cleanly. Debian and RPM bundles were produced. AppImage packaging failed at linuxdeploy; its exact cause and success on CI remain unverified. Native Linux file-operation QA remains outstanding. This is partial Linux verification, not full platform coverage.

Published September 9, 2026: the scanned `main` branch is public at `https://github.com/TechSnazzy/plainleaf`. GitHub Actions and Dependabot started after the initial push. No binary release, signing, notarization, or production-readiness claim has been made.

September 9, 2026 follow-up: verified local `main` == `origin/main` (`ba2261c`); the push completed despite an assistant usage-limit interruption. Gitleaks 8.30.1 installed and the required full-history scan (`gitleaks git --redact --log-opts=--all`, 8 commits) ran clean — no leaks. Working-tree `npm run scan:secrets` also passed.

Latest minimal-UI update: launch and New start with a blank Untitled document (no welcome heading or sample text). Scrollbars are visually hidden across Write/Source while native overflow scrolling stays enabled. Browser long-document check confirmed scroll movement with scrollbar-width none. `npm run verify` passes with 17 frontend tests; Mac debug bundle rebuilt. Save any draft before restarting the running app.

Latest update: Write originally defaulted to 26px and can increase to 64px through the controls or Cmd/Ctrl + plus. On September 10, the requested fresh-install default changed to 18px. Source/code sizing is unchanged. The default/maximum-size regression test covers this behavior.

Current milestone: reviewable local Mac prototype with editable Write/Source modes and sans-serif typography. Updated September 9, 2026.

Implemented: Svelte interface, CodeMirror Source, Tiptap Write, conservative unsupported-Markdown protection, system/light/dark themes, formatting commands, native Rust open/save, atomic writes, external-change comparison on save, unsaved-change dialog, README, ignore rules, staged/history secret-check hooks and cross-platform CI configuration.

Verified: npm run verify (15 tests; zero Svelte diagnostics; frontend build and credential-pattern scan); npm audit (zero known vulnerabilities); cargo test --locked (4 tests). Browser checks confirm both themes, edits flowing in both directions, and New/Cancel/Discard protection. The original Mac bundle launched successfully; the rebuilt editable version still needs native interaction QA. Vite warns about a ~1.14 MB JavaScript chunk.

No binary release, release signing, Windows runtime verification, full Linux functional verification, or Rust advisory audit has occurred. Do not label this production-ready or fully security-audited. Use copies of important files during review.

Next small work units:

1. Native save/reopen/cancel/close/quit and external-change QA; see docs/qa.md.
2. Unified undo and cross-mode selection; expand round-trip tests. Actual Write edits normalize Markdown; unsupported formats require Source.
3. Improve link editing, formatted find, empty-page guidance and large-bundle loading.
4. Recovery drafts and file association/drop integration.
5. Rust advisory audit, Windows/Linux runtime checks, signing and packaging.

Toolchain: repository pins Rust 1.98.1 and Node major 24. This session tested with Node 26.8.1. Temporary bootstrap tools live outside the repo; normal development requires Node/Rust/Tauri prerequisites and Gitleaks installed. No personal machine settings were copied.
