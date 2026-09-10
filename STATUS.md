# Plainleaf status

## Active work — September 10 native file-safety pass

The user closed the unsaved draft, so disposable manual native testing may resume after rebuilding. External-change comparison now has direct coverage for unchanged, externally changed, and missing original files; rejected saves are proven not to overwrite disk content. Rust tests pass (7), and frontend verification passes (19 tests, zero diagnostics, build and working-tree secret scan). Manual Save As/reopen/cancel/close/quit and external-change UI checks remain. Use only disposable fixtures and stop if an unexpected user draft appears. Sol low is appropriate; recommend Sol medium only if tests expose a nontrivial cross-platform bug.

September 10 heading follow-up: the former single Heading command is now three explicit H1, H2, and H3 controls in Write and Source. In Source, changing a selected heading replaces an existing Markdown heading prefix instead of stacking another prefix. Keep this narrow behavior and the approved toolbar design intact.

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
