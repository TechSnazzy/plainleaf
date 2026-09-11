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
- [x] Linux runtime checks on Omarchy / Hyprland (Wayland). Release binary launches, editor
      renders, cold-launch and second-instance `.md` open work; see the Linux section below.
      GNOME and KDE not tested.
- [ ] Cold-launch Finder double-click on a .md/.markdown file loads its content (not a blank Untitled document).
- [ ] Finder double-click on a second file while Plainleaf is already running, with a clean document, replaces it.
- [ ] Finder double-click on another file while the current document is dirty triggers Save/Discard/Cancel, and each choice behaves correctly.
- [ ] An invalid external file (wrong extension, not UTF-8, oversized, deleted) fails safely without changing the current document.
- [ ] The Dock/Finder icon shows the black tile with the gradient-filled green leaf and black outline/veins (not the earlier green-outline-only version, the old off-white icon, or a cached stale one).
- [ ] Dark mode reads as neutral space gray with a green accent, not the old green-tinted background/panels.
- [ ] New / Open / Save / Save as are visible as icon buttons in the toolbar at normal window width, and the hamburger menu on a narrow window contains only appearance settings.

Native interaction automation repeatedly reported that the user changed the app; no successful click or save verification is claimed. Repeat native functional QA once UI control is available. No signing or notarization is claimed for the local debug bundle.

September 9 checks: npm run verify passes; Svelte reports zero errors/warnings; npm audit reports zero known vulnerabilities. Vite reports a large JavaScript chunk (~1.14 MB uncompressed), an optimization follow-up rather than a failed build. Rust dependency advisory audit remains outstanding.

September 10 icon/dark-mode/toolbar redesign: approved against a mocked-up preview first, then implemented. svelte-check (0 errors) and the working-tree secret scan were run directly against the real project; npm test, npm run build, cargo test, the icon regeneration, the debug rebuild, and the full-history secret scan need the real Mac toolchain, so they're still pending a run of the verify-and-publish script -- see STATUS.md for whatever it reports once that's run. The three new manual checklist items above (icon, dark mode, toolbar) are unchecked because they're a visual check on Sean's own eyes, which this automated run can't do.

September 11 icon revision: the leaf changed from a green outline on the black tile to a green gradient fill (light upper-left, deepening toward the lower-right), with the outline and vein lines switching from green to black so the linework reads as one layer on top of the fill. Approved against a mocked-up preview first. Still needs `npx tauri icon assets/icon.svg` to regenerate the platform icon set, plus the same verify/test/build/gitleaks pass as prior changes, on the real Mac toolchain.

September 10 Finder file-open fix: implementation and its new automated tests (5 Rust, 4 frontend) were run for real on Sean's Mac via an automated verify-and-publish script -- npm run verify (Svelte typecheck, all frontend tests, build, working-tree secret scan), cargo test --manifest-path src-tauri/Cargo.toml (13 tests), and a full-history gitleaks scan all passed; the app was rebuilt and its Info.plist was confirmed to declare the Markdown file association. The change is committed and pushed to main. The four new manual checklist items above (Finder cold launch, replace-while-running, dirty-document prompt, invalid file) remain unchecked because they cover hands-on Finder interaction, which this automated run did not perform -- see STATUS.md for the full explanation.

## Linux file-open (September 10, Omarchy / Hyprland, Wayland)

Run for real against the release binary on Sean's machine, disposable `.md` fixtures only.
Environment: Hyprland on Arch (Omarchy), `wayland-1`, webkit2gtk-4.1 2.52. GNOME and KDE were
not tested; the earlier "GNOME and KDE" checklist line has been corrected to reflect this.

- [x] `npm run verify` (25 frontend), `cargo test` (15), `cargo build --release` (no
      warnings), `npx tauri build` (deb + rpm bundle; generated `.desktop` has
      `Exec=plainleaf %F` + `MimeType=text/markdown;text/x-markdown;`; AppImage still fails at
      `linuxdeploy`, pre-existing), full-history gitleaks scan clean.
- [x] Release binary launches on Hyprland; editor renders (dark theme observed; light not
      toggled live).
- [x] Cold launch: `plainleaf note.md` opens with the file's content and a clean state, not
      a blank Untitled document.
- [x] Second instance: with Plainleaf already running on a clean document, `plainleaf
      other.md` — the second process exits immediately, the existing window switches to
      `other.md` and is focused, no second window.
- [~] Second instance with a dirty document triggers Save/Discard/Cancel — covered by
      `src/App.test.ts` "native external file open" (Cancel preserves the draft; Discard
      loads the new file); not re-clicked in the live window (no webview input injection
      available this session).
- [~] Invalid external file reports an error without changing the document — covered by the
      same test block's `open-request-failed` case; Rust side has
      `invalid_or_missing_incoming_files_are_rejected`.
- [x] Desktop association via GTK file managers: `gio open note.md` (what Nautilus uses)
      launches Plainleaf with the file. Terminal `xdg-open note.md` is unreliable because
      `file(1)` reports `.md` as `text/plain` on this system — see STATUS.md caveat.
