# SWC And Generated Build Artifacts

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Current Finding](#current-finding)
- [Decision](#decision)
- [Related Generated Folders](#related-generated-folders)

<!-- docs-toc:end -->

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../CREDITS.md).

TrustLedger relies on Next.js and its bundled SWC compiler for frontend builds.
The repository does not use a root `.swcrc` because Next.js owns the runtime
compiler pipeline, but the frontend now keeps an explicit SWC policy under
`src/.swc/config.json` for local tools, audits, and future plugin review.

## Current Finding

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The root `.swc/` directory documents why no root-level SWC compiler override is
enabled. The `src/.swc/` directory contains the frontend SWC policy and ignores
generated native plugin caches.

## Decision

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Keep Next.js as the source of truth for production transforms. Use
`src/.swc/config.json` only when a local tool needs an explicit parser, target,
module, or React transform policy. Any future SWC plugin must be documented in
`src/.swc/plugins/README.md` before it is added to the build.

## Related Generated Folders

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

These folders are generated locally and should not be edited by hand:

| Path                           | Source                                      |
| ------------------------------ | ------------------------------------------- |
| `src/.next/`                   | Next.js development and build output.       |
| `src/.swc/plugins/<platform>/` | Downloaded SWC native plugin cache.         |
| `.vercel/output/`              | Vercel build output.                        |
| `artifacts/`                   | Hardhat compile output and TypeChain types. |
| `contracts/out/`               | Foundry build output.                       |
| `contracts/cache/`             | Foundry cache.                              |
| `src/coverage/`                | Jest coverage output.                       |
| `site/`                        | MkDocs build output.                        |
| `__pycache__/`                 | Python bytecode cache.                      |

Use documented cache-cleaning scripts instead of manually editing generated
content.
