# Architecture decisions

The prototype uses Tauri 2, Svelte 5, TypeScript, CodeMirror 6, Tiptap 3 with Markdown support, marked and DOMPurify. Package versions and lockfiles are pinned. Rust is pinned through rust-toolchain.toml. Node uses the 24 LTS line; exact baseline patch pinning remains a setup task.

Both editors stay mounted. Write edits formatted content; Source edits Markdown text. App state owns the Markdown and saved snapshot. Mode changes synchronize the destination editor without marking the file changed. Tiptap serializes only after an actual edit; equivalent Markdown syntax may then normalize. Unsupported constructs and semantic round-trip mismatches fall back to sanitized, read-only preview with explicit Source guidance. A new/open document remounts both editors. Separate undo stacks are retained; unified cross-mode undo and selection mapping remain incomplete.

Rust retains the selected path and the last observed disk content; the webview cannot submit arbitrary filesystem paths. Async native file dialogs establish access. Files are limited to 10 MB and UTF-8.

Save checks the prior disk content, writes a temporary sibling, flushes it and replaces the target. This is not a filesystem lock: a simultaneous external write between comparison and replacement remains a limitation to harden. Save As uses native overwrite confirmation. Quit and window close route through the unsaved-changes prompt.

Protected rendering allows a limited HTML vocabulary and no images, frames, scripts, or event attributes. Preview checkboxes are disabled; Write task checkboxes are editable document content. Tiptap uses a fixed schema, plain-text paste, no drop imports, and validated HTTP(S) links. The CSP permits bundled code, editor-required inline styles and local IPC only. External HTTP(S) links open through a narrowly scoped opener plugin. Custom Rust commands require their own validation; plugin capability configuration does not validate their arguments automatically.

Only appearance preference is persisted. No document recovery draft or recent file list exists yet. A web preview is available for UI work; its Save downloads a copy, so it is not equivalent to native disk saving.

The first prototype has one window. Multi-window behavior, file associations, drop handling, local assets, robust reader search and recovery are subsequent work.
