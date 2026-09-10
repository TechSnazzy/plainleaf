# Plainleaf status

Current milestone: reviewable local Mac prototype with editable Write/Source modes and sans-serif typography. Updated September 9, 2026.

Implemented: Svelte interface, CodeMirror Source, Tiptap Write, conservative unsupported-Markdown protection, system/light/dark themes, formatting commands, native Rust open/save, atomic writes, external-change comparison on save, unsaved-change dialog, README, ignore rules, staged/history secret-check hooks and cross-platform CI configuration.

Verified: npm run verify (15 tests; zero Svelte diagnostics; frontend build and credential-pattern scan); npm audit (zero known vulnerabilities); cargo test --locked (4 tests). Browser checks confirm both themes, edits flowing in both directions, and New/Cancel/Discard protection. The original Mac bundle launched successfully; the rebuilt editable version still needs native interaction QA. Vite warns about a ~1.14 MB JavaScript chunk.

No remote, publication, release signing, Windows/Linux runtime verification, or Rust advisory audit has occurred. Do not label this production-ready or fully security-audited. Use copies of important files during review.

Next small work units:

1. Native save/reopen/cancel/close/quit and external-change QA; see docs/qa.md.
2. Unified undo and cross-mode selection; expand round-trip tests. Actual Write edits normalize Markdown; unsupported formats require Source.
3. Improve link editing, formatted find, empty-page guidance and large-bundle loading.
4. Recovery drafts and file association/drop integration.
5. Rust advisory audit, Windows/Linux runtime checks, signing and packaging.

Toolchain: repository pins Rust 1.98.1 and Node major 24. This session tested with Node 26.8.1. Temporary bootstrap tools live outside the repo; normal development requires Node/Rust/Tauri prerequisites and Gitleaks installed. No personal machine settings were copied.
