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
- [Authors and Contributors](#authors-and-contributors)
- [Legal](#legal)

<!-- docs-toc:end -->

> **Kevin K. Le** ([LinkedIn](https://linkedin.com/in/lekevin1)) — Founder,
> Founding Engineer, and Current Lead Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon.
>
> **Kellen Snider** — Founding Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon. His vision, ideas, and dedication
> during TrustLedger's Ethereum development were invaluable to the codebase we
> build on today.
>
> See [`CREDITS.md`](CREDITS.md).

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

## Authors and Contributors

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **Kevin K. Le** — Founder, Founding Engineer, and Current Lead Engineer
  ([LinkedIn](https://www.linkedin.com/in/lekevin1))
- **Kellen Snider** — Founding Engineer
  ([LinkedIn](https://www.linkedin.com/in/kellen-snider-683396256/))

See [`CREDITS.md`](CREDITS.md) for the complete acknowledgement list.

## Legal

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

This document is part of TrustLedger, an open-source decentralized escrow and
arbitration protocol. Use of this software and documentation is subject to the
[Terms and Conditions](../TERMS_AND_CONDITIONS.md),
[Privacy Policy](../PRIVACY_POLICY.md), and
[Risk Disclosure](../RISK_DISCLOSURE.md). See [`LEGAL.md`](LEGAL.md) for the
full compliance and licensing overview.
