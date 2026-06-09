# macOS arm64 SWC Plugin Cache

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

This directory is seeded locally from `src/node_modules/@next/swc-darwin-arm64`.
The native `.node` binary is generated/dependency material and remains ignored.

Repopulate after dependency installation:

```bash
cp src/node_modules/@next/swc-darwin-arm64/next-swc.darwin-arm64.node \
  src/.swc/plugins/macos_aarch64_24.0.0/next-swc.darwin-arm64.node
```
