---
name: swc-cache
description: Maintain TrustLedger SWC binary cache population and ignore policy.
version: "1.0.0"
---

# SWC Cache

Use this skill when touching `.swc/`, Next.js builds, pre-push hooks, or SWC
cache policy.

## Commands

Run from the repository root:

```sh
npm run swc:populate
npm run build:frontend
```

The platform binary under `src/.swc/plugins/<platform>/` is generated and should
remain ignored. Policy and manifest files may be tracked when they are
human-reviewed and contain no secrets.

SHA-256 values in SWC manifests are integrity hashes, not secrets. They should
still be treated as build metadata rather than credentials.
