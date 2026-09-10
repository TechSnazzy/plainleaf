# Prototype QA

Automated: 19 frontend tests for dirty state, Markdown safety, formatted edits, safe synchronization, unsupported-content fallback, Write/Source integration, heading levels and toolbar preferences; 7 native tests cover UTF-8, extensions, atomic writes, failed saves, unchanged originals, external changes and missing originals. Run npm run verify and cargo test --locked --manifest-path src-tauri/Cargo.toml.

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

Native interaction automation repeatedly reported that the user changed the app; no successful click or save verification is claimed. Repeat native functional QA once UI control is available. No signing or notarization is claimed for the local debug bundle.

September 9 checks: npm run verify passes; Svelte reports zero errors/warnings; npm audit reports zero known vulnerabilities. Vite reports a large JavaScript chunk (~1.14 MB uncompressed), an optimization follow-up rather than a failed build. Rust dependency advisory audit remains outstanding.
