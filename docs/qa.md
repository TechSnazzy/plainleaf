# Prototype QA

Automated: 20 frontend tests for dirty state, Markdown safety, formatted edits, safe synchronization, unsupported-content fallback, Write/Source integration, heading levels, toolbar preferences and the compact header menu; 7 native tests cover UTF-8, extensions, atomic writes, failed saves, unchanged originals, external changes and missing originals. Run npm run verify and cargo test --locked --manifest-path src-tauri/Cargo.toml.

Manual checklist (record only observed outcomes):

- [x] Browser reader renders sample content.
- [x] Native Mac bundle compiles and launches with the reader visible.
- [x] Browser Write uses sans-serif typography in both light and dark themes.
- [x] Browser draft in Write → Source edit → Write preserves both edits.
- [x] Browser New offers a save prompt; Cancel preserves the draft, Discard opens a blank document.
- [ ] Unified cross-mode selection and undo semantics.
- [ ] Create, type, save, reopen and verify exact file bytes.
- [ ] Cancel Save As without losing changes.
- [ ] New/Open/Close/Quit each protect unsaved work.
- [ ] Change the file externally; Save refuses to overwrite it.
- [ ] Light/Dark/System and keyboard navigation work in the native app.
- [ ] Malicious fixtures cannot navigate, execute or load remote assets.
- [ ] Windows runtime checks.
- [ ] Linux GNOME and KDE runtime checks.
- [ ] Cold-launch Finder double-click on a .md/.markdown file loads its content (not a blank Untitled document).
- [ ] Finder double-click on a second file while Plainleaf is already running, with a clean document, replaces it.
- [ ] Finder double-click on another file while the current document is dirty triggers Save/Discard/Cancel, and each choice behaves correctly.
- [ ] An invalid external file (wrong extension, not UTF-8, oversized, deleted) fails safely without changing the current document.

Native interaction automation repeatedly reported that the user changed the app; no successful click or save verification is claimed. Repeat native functional QA once UI control is available. No signing or notarization is claimed for the local debug bundle.

September 9 checks: npm run verify passes; Svelte reports zero errors/warnings; npm audit reports zero known vulnerabilities. Vite reports a large JavaScript chunk (~1.14 MB uncompressed), an optimization follow-up rather than a failed build. Rust dependency advisory audit remains outstanding.

September 10 Finder file-open fix: implementation and its new automated tests (5 Rust, 4 frontend) were written and reviewed but not executed in this session -- this session's available shells had no Rust toolchain, no macOS build tooling, and this account's network policy blocked package registries everywhere it had access, so no toolchain could be installed as a substitute either. The change is committed locally, not pushed. The four new manual checklist items above (Finder cold launch, replace-while-running, dirty-document prompt, invalid file) are unchecked for the same reason -- see STATUS.md for the full explanation.
