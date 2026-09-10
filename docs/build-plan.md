# Plainleaf build plan

- Status: local prototype; hardening and platform QA remain
- Working name: Plainleaf
- Target platforms: macOS, Windows, and Linux

- Local repository: `~/Projects/plainleaf`
- Intended GitHub repository: `github.com/TechSnazzy/plainleaf`

The local repository has been created. No GitHub remote or publication has been performed.

## Latest scope update — September 9, 2026

Replace Read/Edit terminology in the original cards below with **Write/Source**. Both modes are editable for supported Markdown; Write uses modern system sans-serif typography, Source uses monospace. The prior no-WYSIWYG boundary is superseded by the user's request. Preserve original source on view switches; document normalization after actual formatted edits and protect unsupported constructs with Source fallback.

The integrated prototype includes Tiptap formatted editing, CodeMirror source editing, native open/save, unsaved-change protection and themes. Next small work units: unified undo/selection semantics; broader round-trip fixtures; native save/quit QA; cross-platform runtime testing; recovery; packaging/signing. Consult STATUS.md in the repo for checks actually completed. The card checklist is a roadmap, not a claim that every feature is finished.

## 1. Product definition

Plainleaf is a quiet desktop app for opening, reading, editing, creating, and saving ordinary Markdown files.

The defining interaction is a single switch between two modes:

- **Read:** beautifully rendered Markdown with comfortable typography.
- **Edit:** the Markdown source with subtle syntax highlighting and a small set of formatting commands.

Plainleaf should feel closer to Preview or TextEdit than to a notes system or code editor. It must work directly with files on disk and never require an account, library, database, or proprietary document format.

### Version 1 must include

- New document
- Open `.md` and `.markdown` files
- Drag a Markdown file onto the window to open it
- Edit Markdown source
- Render GitHub-flavored Markdown
- Instant Read/Edit toggle
- Save and Save As
- Protection against accidentally discarding unsaved changes
- Undo and redo
- Find and replace
- System, light, and dark appearance settings
- Keyboard-accessible commands
- Basic formatting commands for bold, italic, headings, links, lists, task lists, quotes, inline code, and fenced code
- Native installers for macOS, Windows, and Linux

### Explicitly outside version 1

- Notes library or file tree
- Tabs
- Accounts or cloud sync
- Collaboration
- Publishing
- AI features
- Plugins
- Wikilinks and backlinks
- PDF or Word export
- Mobile apps
- Rich-text/WYSIWYG editing
- Custom themes beyond the included light and dark designs

Any proposed feature that does not support opening, reading, editing, or saving one Markdown document should wait until after version 1.

## 2. Recommended architecture

Use one shared application codebase:

- **Desktop shell:** Tauri 2
- **Interface:** Svelte with TypeScript
- **Editor:** CodeMirror 6
- **Markdown:** a CommonMark/GitHub-flavored Markdown parser
- **Rendered-view safety:** sanitize generated HTML and block executable or unsafe content
- **Settings:** a tiny local preference store containing appearance and reading preferences only
- **Files:** native open/save dialogs and direct filesystem access through Tauri
- **Automation:** GitHub Actions builds on macOS, Windows, and Linux

Version 1 has no server component. It should make no network requests during ordinary reading and editing. There is no database, account system, authentication flow, API key, password, session cookie, analytics service, or telemetry endpoint.

Keep the core document state independent of the UI. One document model should own:

- Current file path, if any
- Current Markdown text
- Last saved text or revision
- Dirty/clean state
- Read/Edit mode
- File encoding and line-ending decisions
- External-change status

The renderer and editor both consume this document model. Switching modes must not read from disk or create a second copy of the document.

## 3. Security model

Plainleaf opens untrusted Markdown inside a desktop webview with permission to interact with user-selected files. Treat the rendered document and editor input as hostile even when the file came from the local disk.

### Security principles

- Grant the webview only the Tauri capabilities required by the current feature.
- Scope file access to files the user explicitly opens or saves. Never grant broad home-directory access.
- Bundle all scripts, styles, icons, and fonts. Load no runtime code from a CDN.
- Use a restrictive Content Security Policy.
- Parse Markdown without executing scripts.
- Sanitize rendered HTML even if the Markdown parser claims to be safe by default.
- Block remote images and other remote content by default. A future opt-in must be per document or clearly visible.
- Open external links in the user's browser; never navigate the privileged application webview to arbitrary pages.
- Validate paths, file extensions, text size, encoding, URLs, and every message crossing the JavaScript/Rust boundary.
- Keep application responses and errors minimal; do not expose filesystem layout or internal stack traces in ordinary UI.
- Pin dependency versions with committed lockfiles.
- Sign release artifacts and publish checksums.
- Send updates and downloads over HTTPS only.

### Secrets and Git policy

Version 1 must not require `.env` files or API keys. The repository must include defenses anyway because development tools and signing systems can introduce credentials.

- Never store credentials, signing certificates, private keys, tokens, or recovery codes in the repository.
- Keep release-signing credentials in the operating-system keychain or the release platform's encrypted secret store.
- Add a project-specific `.gitignore` before the first commit.
- Run a local secret scan before every push through a pre-push hook or equivalent repository command.
- Enable GitHub push protection and secret scanning when available.
- CI must scan the full reachable Git history, not only the latest files.
- Never bypass a secret-scanning failure merely to make a push succeed.
- Use obvious fake values in fixtures and documentation; do not include realistic token-shaped examples.

If a real secret is ever committed:

1. Stop publishing and determine what was exposed.
2. Revoke or rotate the secret immediately. Removing text from Git does not make the credential safe again.
3. Remove it from the working tree and add a prevention rule.
4. Purge it from history with a purpose-built history-rewriting tool after making a recoverable backup and coordinating any public-history rewrite.
5. Re-scan all refs and release artifacts.
6. Replace affected clones or carefully remove the old objects so the secret is not reintroduced.
7. Record the incident without recording the secret itself.

### Dependency and release security

- Commit JavaScript and Rust lockfiles.
- Run JavaScript package audit, Rust advisory audit, secret scanning, linting, tests, and builds in CI.
- Enable Dependabot security alerts and security-update pull requests.
- Pin third-party GitHub Actions to immutable commit SHAs.
- Give GitHub Actions the minimum `permissions` required by each job.
- Do not expose secrets to builds from untrusted pull requests.
- Generate a software bill of materials for public releases.
- Add artifact provenance/attestation when the repository and hosting plan support it.
- Publish a `SECURITY.md` with a private vulnerability-reporting route before public release.

### Mapping the requested web-security checklist

| Requested control                                                                             | Plainleaf version 1 decision                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hide API keys                                                                                 | No API keys exist; repository and CI still scan for accidental secrets.                                                                                                   |
| Purge secrets from Git                                                                        | Revoke first, then use a controlled history-rewrite and full re-scan procedure.                                                                                           |
| Expose only the public DB key                                                                 | No database or database key exists.                                                                                                                                       |
| Row-level security and locked record access                                                   | No database or records exist. Required security redesign if a backend is ever proposed.                                                                                   |
| Encrypt sensitive data                                                                        | Plainleaf stores only non-sensitive preferences. User documents remain ordinary files under operating-system permissions. It will not claim application-level encryption. |
| Server-side auth, password hashing, login rate limits, bot protection, secure session cookies | No server, accounts, login, passwords, or cookies exist. These become mandatory design work before any future account feature.                                            |
| Block field tampering and parameterize queries                                                | No API objects or database queries exist. IPC messages are strongly typed and validated.                                                                                  |
| Validate all input                                                                            | Required for file paths, encodings, document size, URLs, Markdown, settings, and IPC.                                                                                     |
| Escape user content                                                                           | Markdown output is sanitized; raw scripts never execute.                                                                                                                  |
| Restrict file uploads                                                                         | There are no uploads. Local file access is limited to explicit user selections.                                                                                           |
| Trim API responses                                                                            | There is no API. Errors and IPC results expose only necessary information.                                                                                                |
| Security headers                                                                              | Apply a restrictive webview CSP and relevant local-response headers.                                                                                                      |
| Force HTTPS                                                                                   | No ordinary network traffic. Releases, updates, and external project links use HTTPS.                                                                                     |
| Scan dependencies                                                                             | Automated JavaScript, Rust, GitHub Actions, and secret checks run in CI.                                                                                                  |
| Sync settings from baseline machine                                                           | Sync only documented, non-secret tool versions and configuration. Never sync credentials.                                                                                 |

Adding cloud sync, accounts, collaboration, remote storage, or a database later requires a new threat model and architecture milestone before any implementation. None should quietly enter version 1.

### Baseline development environment

The first machine establishes reproducible, non-secret project configuration:

- Pinned Rust toolchain
- Pinned Node.js and package-manager versions
- Committed lockfiles
- Formatter, linter, editor settings, and line-ending rules
- Cross-platform bootstrap and validation commands
- Git hooks installed by a documented setup command

Machine-specific paths, shell profiles, signing identities, tokens, and keychain contents must never be synchronized into the repository.

## 4. Working method for a limited ChatGPT Plus budget

Use a separate Codex task for each numbered build card below. Each card should end with:

1. A small, reviewable change
2. Relevant checks passing
3. One Git commit
4. A short update to `docs/status.md`

Create these project memory files during setup:

- `AGENTS.md`: concise project rules and validation commands
- `docs/product.md`: the fixed version 1 scope
- `docs/architecture.md`: accepted technical decisions
- `docs/status.md`: completed card, current card, and known issues
- `docs/qa.md`: manual cross-platform checks

These files replace the need to paste the whole project history into every task. At the start of a task, ask Codex to read only `AGENTS.md`, `docs/status.md`, the relevant specification, and the files it needs to change.

Use Astra at **low reasoning** for contained implementation cards. Use **medium** for file lifecycle, document-state design, security, and packaging failures. Reserve high reasoning for a specific difficult bug. Avoid combining research, implementation, redesign, and release work in one session.

### Reusable Codex task prompt

> Work only on Plainleaf build card `[number and title]`. Read `AGENTS.md`, `docs/product.md`, `docs/architecture.md`, and `docs/status.md`, then inspect only the relevant code. Keep the version 1 exclusions intact. Implement the card, run the checks appropriate to the change, fix failures caused by the change, update `docs/status.md`, and make one focused commit. Stop after the card's acceptance criteria pass. Report the commit, checks, and any remaining issue.

For a bug, use a separate prompt and commit:

> Diagnose and fix `[specific observed behavior]`. Reproduce it first or add the smallest meaningful regression test. Do not refactor unrelated code or add features. Run the relevant checks, update `docs/status.md`, and make one focused commit.

## 5. Build cards

Each card is a bounded work item, not a guaranteed fit within one usage window. Split a card when its implementation or validation proves larger than expected. Planning cards 01–03 are saved as documents; import them into the repository and commit during Card 04. Later cards use focused commits and status updates.

After Cards 04, 04A, and 05, add an **early integration checkpoint**: minimally connect document state, native Open, source Edit, rendered Read, Save/Save As, and unsaved-change protection. Use a bundled Markdown fixture and verify the end-to-end flow on the development machine. This brings forward only the minimum work from Cards 08–17 needed to test the architecture. Subsequent cards extend and harden that implementation; do not rebuild it. Cross-platform compilation is not a substitute for later runtime QA.

### Milestone A — Freeze the idea

#### Card 01: Product contract

Create `docs/product.md` from the version 1 scope in this plan. Add five representative user stories and five non-goals.

Acceptance:

- Every version 1 feature maps to a user story or supporting requirement.
- The non-goals clearly exclude library, sync, AI, and WYSIWYG behavior.

#### Card 02: Interaction wireframes

Create low-fidelity wireframes for the empty window, Edit mode, Read mode, open-file error, unsaved-changes prompt, and external-change prompt.

Acceptance:

- The normal window contains no permanent sidebar.
- Read/Edit and appearance controls have defined locations.
- Keyboard access is documented.

#### Card 03: Visual direction

Choose the typography, spacing scale, light palette, dark palette, icon style, and temporary app icon. Record them as design tokens rather than scattered values.

Acceptance:

- Both themes meet accessible text contrast.
- Reader width and type scale are specified.
- Branding remains replaceable if the name fails legal clearance.

### Milestone B — Establish the foundation

#### Card 04: Repository scaffold

Create `~/Projects/plainleaf` as a local Git repository, then create the Tauri 2, Svelte, and TypeScript project. Do not publish or create the GitHub remote as part of this card. Add formatting, linting, type checking, unit testing, development commands, and pinned tool versions.

Acceptance:

- The empty app launches locally.
- Format, lint, type-check, and unit-test commands pass.
- `AGENTS.md` lists the exact commands.
- `README.md` explains the product, current status, local setup, validation commands, version 1 scope, supported platforms, privacy posture, and license status.
- `.gitignore` excludes dependency output, build artifacts, editor/OS files, signing material, credentials, and all `.env` variants.
- No secret or machine-specific absolute path appears in tracked files.
- Rust and JavaScript lockfiles are committed.

#### Card 04A: Repository security baseline

Add `SECURITY.md`, secret-scanning configuration, a local pre-push secret scan, dependency-audit commands, safe GitHub Actions defaults, and a documented secret-incident procedure.

Acceptance:

- A deliberately planted fake secret fixture causes the test scanner to fail without placing a real credential in Git.
- CI permissions default to read-only and expand only in jobs that require more.
- Third-party actions are pinned to full commit SHAs.
- The security checks run through one documented local command.
- The incident procedure requires revocation before history rewriting.

#### Card 05: Cross-platform build CI

Add continuous-integration jobs that compile on macOS, Windows, and Linux without publishing anything.

Acceptance:

- All three operating-system jobs complete.
- Build failures are visible independently for each platform.
- Dependency audits and secret scans run before release artifacts can be produced.

#### Card 06: Application shell

Build the single-window shell, empty-document state, minimal title area, and responsive content surface.

Acceptance:

- The window remains usable at its documented minimum size.
- It looks intentional in system light and dark appearances.
- No editor or file handling is included yet.

#### Card 07: Theme system

Implement System, Light, and Dark settings using the design tokens from Card 03.

Acceptance:

- System mode follows operating-system changes while the app is running.
- The user's override persists across launches.
- There is no flash of the wrong theme at startup.

### Milestone C — Make one document trustworthy

#### Card 08: Document state model

Implement and test the in-memory document model: text, optional path, dirty state, saved revision, and current mode.

Acceptance:

- Dirty state changes correctly through edits, saves, undo, and return to saved content.
- The model has unit tests and no dependency on a particular UI component.

#### Card 09: New document

Connect New to the document model and establish the Untitled window-title behavior.

Acceptance:

- A blank document can be created with menu and keyboard commands.
- Creating a new document cannot silently discard unsaved work.

#### Card 10: Open document

Open `.md` and `.markdown` files through the native dialog and operating-system file association.

Acceptance:

- UTF-8 Markdown opens correctly.
- Unsupported, unreadable, and invalid files produce useful errors.
- Opening a file updates the title and clean state.
- File access remains scoped to the user-selected document and required adjacent local assets only.
- Oversized documents fail safely or require an explicit user decision.

#### Card 11: Save and Save As

Implement atomic Save and Save As behavior.

Acceptance:

- Save never truncates a file if writing fails.
- Untitled documents invoke Save As.
- Cancel leaves document state unchanged.
- A successful save clears dirty state.

#### Card 12: Unsaved-change protection

Handle close, quit, New, and Open when the current document is dirty.

Acceptance:

- The user can Save, Discard, or Cancel.
- Cancel reliably stops the pending action on all three platforms.

#### Card 13: External file changes

Detect when the open file changes or disappears outside Plainleaf and offer safe choices.

Acceptance:

- A clean document can reload without data loss.
- A dirty document is never overwritten automatically.
- Deleted and renamed files have understandable recovery paths.

### Milestone D — Build the two modes

#### Card 14: Basic source editor

Integrate CodeMirror with plain editing, selection, undo/redo, and scrolling.

Acceptance:

- Typing updates the document model.
- Undo/redo integrates with dirty state.
- Large-file behavior is tested with a representative fixture.

#### Card 15: Markdown syntax treatment

Add restrained Markdown syntax highlighting and comfortable editing typography.

Acceptance:

- Light and dark syntax colors remain readable.
- Markdown punctuation remains visible.
- The editor never changes file content merely by displaying it.

#### Card 16: Markdown renderer

Render headings, paragraphs, emphasis, links, lists, task lists, tables, quotes, inline code, and fenced code.

Acceptance:

- A checked-in fixture covers supported syntax.
- Raw scripts and unsafe HTML cannot execute.
- Rendering produces no network request by default.
- External links leave the privileged webview and open through the operating system.
- The Content Security Policy blocks inline scripts and unapproved connections.

#### Card 17: Read/Edit toggle

Connect both views to the same document and implement the defining toggle.

Acceptance:

- Switching is instant and never changes the Markdown.
- Cursor or approximate scroll position is preserved sensibly.
- A keyboard shortcut and accessible control both work.

#### Card 18: Reader typography

Polish measure, spacing, headings, lists, links, tables, quotes, and code in both themes.

Acceptance:

- Long-form reading is comfortable at common window widths.
- Overflowing tables and code do not break the window.
- Reader zoom or text-size adjustment is keyboard accessible.

### Milestone E — Add only basic editing tools

#### Card 19: Inline formatting commands

Add bold, italic, inline code, and link commands using selections and sensible cursor placement.

Acceptance:

- Commands work from menus and standard shortcuts.
- Toggling or applying markup never unexpectedly deletes selected text.
- Unit tests cover empty and non-empty selections.

#### Card 20: Block formatting commands

Add headings, bulleted lists, numbered lists, task lists, block quotes, and fenced code.

Acceptance:

- Multi-line selections behave predictably.
- Indentation and line endings are preserved.
- Repeating a command has documented toggle behavior.

#### Card 21: Find and replace

Provide native-feeling find, next/previous match, and replace behavior in Edit mode; provide find-only behavior in Read mode.

Acceptance:

- Platform-standard shortcuts work.
- Search state does not alter the document.

#### Card 22: Drag and drop

Allow a Markdown file to be dropped on the window and define behavior for dropped text, links, images, and unsupported files.

Acceptance:

- Dropping a file observes unsaved-change protection.
- Unsupported drops never corrupt the document.

### Milestone F — Make it feel finished

#### Card 23: Keyboard and accessibility audit

Audit focus order, control labels, contrast, reduced motion, screen-reader output, and keyboard-only operation.

Acceptance:

- Every command can be reached without a mouse.
- Read/Edit state is announced accessibly.
- The app respects reduced-motion preferences.

#### Card 24: Platform conventions

Tune menus, shortcuts, window titles, dialogs, and file associations for macOS, Windows, and Linux.

Acceptance:

- `Command` and `Control` conventions are correct.
- Native window and file actions behave as users expect on each platform.
- Platform-specific differences are documented rather than hidden in conditionals without explanation.

#### Card 25: Performance and reliability pass

Measure cold start, mode-switch latency, memory use, large-file editing, crash recovery, and failed-save behavior.

Acceptance:

- Targets are recorded before optimization.
- Regressions have reproducible fixtures or tests.
- No speculative rewrite is performed without a measured problem.

#### Card 25A: Security verification

Review the actual Tauri capability graph, CSP, IPC validation, link handling, Markdown sanitization, filesystem scope, dependency reports, and release workflow.

Acceptance:

- Each enabled capability maps to a version 1 requirement.
- A malicious-Markdown fixture cannot execute script, navigate the app webview, read arbitrary files, or make network requests.
- Secret scans cover tracked content and reachable Git history.
- Dependency findings are resolved, explicitly accepted with rationale, or block release.

#### Card 26: Manual QA matrix

Run `docs/qa.md` on a supported macOS version, Windows version, and at least two representative Linux desktop environments.

Acceptance:

- Results are recorded by operating system.
- Release-blocking failures become separate bug cards.

### Milestone G — Package a private alpha

#### Card 27: Application identity

Finalize the name only after an App Store, package registry, domain, and trademark screening. Produce final icons and application identifiers.

Acceptance:

- The final name has documented search results.
- Icons exist in every required platform size.
- Identifiers will not need to change after public release.

#### Card 28: Installers and signing

Produce signed/notarized macOS output, signed Windows installers, and Linux packages.

Acceptance:

- A clean machine can install, launch, associate `.md` files, save, and uninstall the app.
- Signing credentials remain outside the repository.

#### Card 29: Private alpha release

Give builds to a small test group with a short feedback form focused on the core interaction.

Ask only:

- Did opening a Markdown file feel immediate?
- Was Read/Edit obvious?
- Did you trust Save?
- Was anything visually distracting?
- What essential action was missing?

Acceptance:

- Feedback is converted into bugs or explicitly deferred ideas.
- Version 1 scope changes only for repeated blockers in the core workflow.

#### Card 30: Public 1.0 release

Complete licenses, acknowledgements, privacy statement, screenshots, website, release notes, update mechanism, and distribution listings.

Acceptance:

- All CI and QA checks pass for the release commit.
- Installers and checksums are published together.
- The website describes the app without promising excluded features.

## 6. Milestone gates

Do not progress merely because all cards were attempted. Use these gates:

- **Foundation gate:** Cards 01–07, including Card 04A, pass and builds work on all three operating systems.
- **Trust gate:** Cards 08–13 pass; file loss scenarios have been deliberately tested.
- **Core experience gate:** Cards 14–18 pass; Read/Edit feels like one continuous document.
- **Feature-complete gate:** Cards 19–22 pass without adding a sidebar or library.
- **Alpha gate:** Cards 23–28, including Card 25A, pass on real machines.
- **Release gate:** Alpha feedback reveals no repeated data-loss, discoverability, or accessibility blocker.

## 7. Decisions to make before coding

The following choices should be resolved during Cards 01–03:

1. Whether Edit mode is raw Markdown only, or includes optional soft wrapping and typewriter scrolling.
2. Whether the mode control says **Read/Edit**, uses icons, or combines both.
3. Whether remote images are blocked, allowed per document, or always allowed. Blocking by default is the safer version 1 choice.
4. Whether inline HTML is shown as text, rendered after sanitization, or unsupported.
5. Which GitHub-flavored Markdown behaviors are promised.
6. Which operating-system versions form the initial support matrix.
7. Whether Plainleaf is free/open source, paid once, or free with optional support.

None of these decisions requires implementing the app first.

## 8. Recommended first work session

Start with **Card 01 only**. Its deliverable should be a one-page product contract, not source code. Once it is reviewed and accepted, proceed to the interaction wireframes. Do not scaffold Tauri until the scope and two-mode interaction are stable.
