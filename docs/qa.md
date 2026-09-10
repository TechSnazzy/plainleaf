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
- [ ] The Dock/Finder icon shows the new black tile with the green leaf outline (not the old off-white icon or a cached stale one).
- [ ] Dark mode reads as neutral space gray with a green accent, not the old green-tinted background/panels.
- [ ] New / Open / Save / Save as are visible as icon buttons in the toolbar at normal window width, and the hamburger menu on a narrow window contains only appearance settings.

Native interaction automation repeatedly reported that the user changed the app; no successful click or save verification is claimed. Repeat native functional QA once UI control is available. No signing or notarization is claimed for the local debug bundle.

September 9 checks: npm run verify passes; Svelte reports zero errors/warnings; npm audit reports zero known vulnerabilities. Vite reports a large JavaScript chunk (~1.14 MB uncompressed), an optimization follow-up rather than a failed build. Rust dependency advisory audit remains outstanding.

September 10 icon/dark-mode/toolbar redesign: approved against a mocked-up preview first, then implemented. svelte-check (0 errors) and the working-tree secret scan were run directly against the real project; npm test, npm run build, cargo test, the icon regeneration, the debug rebuild, and the full-history secret scan need the real Mac toolchain, so they're still pending a run of the verify-and-publish script -- see STATUS.md for whatever it reports once that's run. The three new manual checklist items above (icon, dark mode, toolbar) are unchecked because they're a visual check on Sean's own eyes, which this automated run can't do.

September 10 Finder file-open fix: implementation and its new automated tests (5 Rust, 4 frontend) were run for real on Sean's Mac via an automated verify-and-publish script -- npm run verify (Svelte typecheck, all frontend tests, build, working-tree secret scan), cargo test --manifest-path src-tauri/Cargo.toml (13 tests), and a full-history gitleaks scan all passed; the app was rebuilt and its Info.plist was confirmed to declare the Markdown file association. The change is committed and pushed to main. The four new manual checklist items above (Finder cold launch, replace-while-running, dirty-document prompt, invalid file) remain unchecked because they cover hands-on Finder interaction, which this automated run did not perform -- see STATUS.md for the full explanation.
