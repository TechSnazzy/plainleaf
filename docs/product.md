# Plainleaf — product contract

Product contract · Updated September 9, 2026

## Latest direction — supersedes the original Read/Edit scope

September 10 design refinement: use wider shared page margins (8% per side, bounded for small/large windows), no header/footer divider rules, no in-app logo or duplicate filename. The native window title retains the filename. Formatting, appearance and size controls are directly visible; the document overflow menu contains only file operations. Separate Settings offers persisted icons-only (default), icons with labels, and labels-only toolbar display. Controls wrap to remain available in smaller windows; icon buttons have accessible labels and tooltips.

The user requested editable text in both views and modern, non-serif typography. The modes are **Write** (formatted, editable Markdown) and **Source** (raw, editable Markdown). New and opened documents start in Write. System sans-serif fonts cover body text, headings, and dialogs; source and code use monospace. No remote fonts are loaded.

Basic formatting is available in both views. Opening or switching views must never rewrite source. Actual formatted edits may normalize equivalent Markdown syntax; this behavior must be documented. Unsupported syntax must not be silently discarded: the prototype protects such documents with a sanitized preview and Source editing. Expand safe formatted support incrementally.

The original “no WYSIWYG editing” exclusion below is withdrawn. Word-processing page layout and Word/PDF export remain out of scope. The stories below are the original planning baseline; references to Read/Edit now mean Write/Source, subject to these updated behaviors. Unified undo and selection preservation across both editors remain release requirements, not completed prototype features.

## Purpose

Plainleaf is a quiet Markdown reader and editor for macOS, Windows, and Linux. Open a file, read it beautifully, edit it simply, and save it anywhere. The experience takes inspiration from iA Writer's restraint while using its own branding and visual design. Plainleaf is a working name, not a cleared trademark.

## Five user stories and their requirements

1. **Read a document immediately.** I can open a `.md` or `.markdown` file from the native file dialog, operating-system file association, or drag-and-drop. Existing documents open in Read mode. Headings, paragraphs, emphasis, links, lists, task lists, tables, quotes, and code render clearly. Long tables and code scroll without widening the window. Markdown is never executed as code.
2. **Create or edit without learning a workspace.** New opens an untitled document in Edit mode. A visible Read/Edit control switches the same document between rendered reading and raw Markdown editing. Switching preserves text, undo history, and each mode's position. There is one document per window and no persistent sidebar. Additional documents use additional windows.
3. **Format with basic, discoverable tools.** Edit mode offers subtle syntax highlighting, soft wrapping, undo/redo, find/replace, and commands for bold, italic, headings, links, bulleted/numbered/task lists, quotes, inline code, and fenced code. Commands are accessible through menus and keyboard shortcuts. Read mode supports finding text. A compact formatting menu is the initial design proposal; a floating toolbar is optional, pending wireframe review.
4. **Trust the app with my files.** Save writes to the current path; Save As chooses a new destination. Unsaved changes are visible. Closing or replacing unsaved work offers Save, Discard, or Cancel. Failed saves preserve the existing file and the in-memory document. External edits never silently overwrite unsaved work. Text remains ordinary UTF-8 Markdown; viewing and toggling never rewrite it. Recovery drafts must stay outside the repository, with documented retention and cleanup.
5. **Use the same calm app on every desktop.** Light, Dark, and System appearances apply to both modes. Text size can be adjusted. Menus, shortcuts, file pickers, and window controls follow platform conventions. Keyboard access, accessible labels, readable contrast, and reduced-motion support are baseline requirements. Installable builds must be tested on macOS, Windows, and a documented Linux support matrix before public release.

## Five non-goals for version 1

1. No notes library, file tree, tabs, tags, backlinks, or proprietary document database.
2. No accounts, cloud sync, collaboration, or app-managed remote storage.
3. No AI assistant, plugins, or executable Markdown extensions.
4. No WYSIWYG editing, word-processing layout controls, or Word/PDF export.
5. No mobile apps, publishing system, theme marketplace, or extensive customization interface.

## Security and privacy contract

Ordinary reading and editing work offline, with no telemetry, runtime API keys, `.env` files, or backend. Bundle fonts and runtime assets locally. Treat documents, links, local assets, imported settings, and IPC arguments as untrusted. Sanitize rendered content, enforce a restrictive CSP, and expose only narrowly scoped native commands. Local resources must not escape approved directories through traversal or symlinks. Remote content is blocked by default; external links open only after user action through validated URL schemes.

Documents are plain text, **not encrypted by Plainleaf**. OS permissions and disk encryption provide their at-rest protection. Logs, screenshots, fixtures, and build artifacts must not contain personal documents or credentials. Release secrets stay in secure credential stores, never source or shipped binaries. Secret scans, dependency audits, lockfiles, least-privilege CI, and release verification are required; `.gitignore` alone is insufficient.

## First usable prototype

After scope, wireframes, and secure repository setup, build a thin slice: native Open → source Edit → rendered Read → Save. Include safe save failures and unsaved-change protection from the start. Exercise an untitled document and a small fixture with headings, lists, emphasis, and code. This is an integration checkpoint, not a public release or a claim that platform/security QA is finished.

## Decisions and boundaries

- Planned repository: `~/Projects/plainleaf`; intended owner: `TechSnazzy`. Creation, remote setup, and publication are separate steps.
- Proposed stack: Tauri 2, Svelte, TypeScript, CodeMirror 6. Confirm library compatibility at setup.
- Baseline-machine settings means reproducible project tool versions and non-secret development configuration. It does not mean copying personal machine settings or adding app cloud sync.
- Explicit Save is required. Crash recovery is planned; automatic overwriting of original files and OS-style version history are deferred until their behavior and cross-platform cost are specified.
- Price/license, exact supported OS versions, final branding, and signing costs remain open. No subscription service is needed by the runtime design.

## Card 01 completion criteria

All version 1 features map to the five stories or security requirements above. Five non-goals establish scope. No app implementation or publication is part of this card. Proceed to Card 02 with the default interaction choices above unless product review changes them.
