# Plainleaf project rules

Read STATUS.md first. Read docs/product.md for scope. Work in focused changes and update status with actual verification results.

No runtime backend, accounts, telemetry, API keys, .env files, or cloud sync. Never log document contents or secrets. Keep rendered Markdown untrusted; do not relax CSP or add broad filesystem or shell access. Do not publish or change repository visibility without user authorization.

Use `npm run verify` and `cargo test --manifest-path src-tauri/Cargo.toml`. Check changes proportionately. Preserve dirty user work. Stage explicit files and scan before commits. Do not include machine-specific paths in tracked configuration. Document blockers and remaining work honestly.
