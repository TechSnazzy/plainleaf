# Security

This is an unreleased prototype; no independent security audit has been performed. Do not use it as an encrypted vault. Markdown files are ordinary text.

Do not put sensitive vulnerability details, personal documents, or credentials in public issues. A private reporting channel must be established before public distribution.

Secrets are prohibited in Git and build artifacts. Use the platform credential store for signing. Before every push, run local secret and dependency checks; enable GitHub push protection and dependency alerts when a remote is created. A matching-pattern scan is a defense, not a guarantee.

If a secret is exposed: revoke/rotate it first, stop affected publishing, remove it from files, coordinate any history rewrite, scan all refs and release artifacts, and prevent old clones from reintroducing it. Never copy the secret into an incident report.

Release gate: sanitized Markdown tests, IPC/path review, dependency audits, full-history secret scanning with a dedicated scanner, signed artifacts and verified updates, and platform QA. No release keys are available to untrusted pull requests.
