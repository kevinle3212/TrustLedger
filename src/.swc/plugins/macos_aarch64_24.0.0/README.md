# macOS arm64 SWC Plugin Cache

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../../CREDITS.md).

This directory is seeded locally from `src/node_modules/@next/swc-darwin-arm64`.
The native `.node` binary is generated/dependency material and remains ignored.

Repopulate after dependency installation:

```bash
cp src/node_modules/@next/swc-darwin-arm64/next-swc.darwin-arm64.node \
  src/.swc/plugins/macos_aarch64_24.0.0/next-swc.darwin-arm64.node
```
