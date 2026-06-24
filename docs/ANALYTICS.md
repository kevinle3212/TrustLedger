# Analytics And Native Kernels

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [User-Facing Analytics](#user-facing-analytics)
- [API Endpoint](#api-endpoint)
- [Python Visualizations](#python-visualizations)
- [Dune Dashboard Plan](#dune-dashboard-plan)
- [Native Kernels](#native-kernels)
- [CI And Hooks](#ci-and-hooks)
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

TrustLedger analytics are intentionally privacy-safe. The app surfaces useful
wallet-specific metrics without scraping sensitive wallet or browser data.

## User-Facing Analytics

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The wallet analytics page lives at `/[locale]/analytics`. Connected users can
open it from the wallet address hover menu in the navigation bar or from the
footer Guide. The page shows a public-state badge, interactive Recharts visuals
(a contract-state trend line and a client/freelancer role-mix donut), and locale
diagnostics as a readable language name plus code such as `English (en)`.

The charts are reusable, client-only wrappers in `src/components/charts/`
(`TrendLineChart`, `BreakdownDonut`) built on `recharts`. Each takes its
accessible name via an `ariaLabel` prop (localized strings stay in the page) and
is loaded with `next/dynamic` (`ssr: false`) so Recharts is excluded from the
initial bundle. See [`CORE.md`](CORE.md) for the shared core layer the analytics
event client (`@/core` → `analytics.track`) is built on.

The page reads:

- Public TrustLedger contract state for contracts where the connected wallet is
  the client or freelancer.
- Public reputation registry score and rating count.
- Connected chain deployment metadata.
- Safe local app preferences, such as the last connector label and dashboard
  guide state.

The page does not read:

- Private keys or seed phrases.
- Raw user documents or encrypted draft contents.
- Emails, session keys, or magic-link tokens.
- Hidden wallet metadata outside what wagmi/Reown exposes for the connected
  session.

## API Endpoint

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`GET /api/analytics/wallet/[address]` validates the wallet address and returns
privacy-boundary metadata for integrations or smoke tests.

The endpoint intentionally does not fetch third-party wallet data. It returns a
deterministic public fingerprint and lists which public/local signal categories
the frontend is allowed to use.

`GET /api/analytics/scientific` returns the generated scientific analytics
manifest. It exposes the available visualization artifacts, derived public demo
metrics, library coverage, and privacy boundary. It does not track real traffic
or visitor behavior by itself; real traffic analytics would need explicit
instrumentation, retention rules, user notice, and privacy review before
deployment.

`POST /api/analytics/events` is the explicit privacy-respecting traffic
instrumentation endpoint. It records only sanitized aggregate event names,
locale, path without query strings, and timestamp when
`TRUSTLEDGER_ANALYTICS_ENABLED=true`. It returns `204` and stores nothing when
disabled or when Do Not Track / Global Privacy Control is present.
`GET /api/analytics/events` is admin-health-gated and returns aggregate counts
for operator monitoring.

The frontend beacon lives in `src/components/PrivacyAnalytics.tsx` and is
disabled unless `NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED=true`.

## Python Visualizations

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Phase 6 analytics visual support lives in `scripts/analytics/`.

```sh
npm run analytics:generate
npm run analytics:check
```

The committed artifacts live under `assets/analytics/`:

- `wallet-analytics-preview.svg`
- `wallet-analytics-report.json`
- `wallet-analytics-plotly.json`
- `wallet-analytics-bokeh.json`

The generator uses NumPy for vectorized metrics, Pandas for tabular status data,
SymPy for exact completion-rate arithmetic, SciPy for entropy, z-score, and
trend statistics, Seaborn for the statistical color palette, Matplotlib for SVG
rendering, Plotly for an interactive chart spec, and Bokeh for a dashboard-ready
data-source spec. Matplotlib writes cache files under project-local
`tmp/matplotlib/` so commands do not write into the user's home directory.

Install the analytics Python dependencies with:

```sh
python3 -m pip install -r scripts/analytics/requirements.txt
```

Do not commit generated visuals that include private keys, seed phrases, emails,
raw documents, encrypted draft bodies, or session keys.

## Dune Dashboard Plan

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The roadmap now tracks a dedicated Dune dashboard integration for public
on-chain metrics. Target charts include contracts created over time, total value
locked, dispute rate, juror participation, appeal activity, token mix, average
time to approval, warranty hold-back claims, and reputation score distributions.

Dune keys and private workspace credentials must stay out of the repository.
When dashboards are published, document the dashboard URL, network, contract
addresses, query date, and SQL references so whitepaper figures and public
metrics are reproducible.

## Native Kernels

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Optional C, C++, and assembly kernels live under `native/`. TrustLedger still
prefers Rust for production services where memory safety matters. The native
files are kept for measured bottlenecks, whitepaper analysis, and future
WebAssembly or N-API experiments.

```sh
npm run native:check
```

The checker compiles representative C, C++, and host-architecture assembly files
with `clang` and `clang++`, then writes object files to project-local
`tmp/native-check/`. These object files are ignored and are not used by the
Next.js runtime.

## CI And Hooks

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The following gates keep analytics artifacts and native kernels healthy:

- Pre-commit: duplicate scan, `native:check`, and `analytics:check`.
- Pre-push: duplicate scan, `native:check`, and `analytics:check`.
- GitHub Actions: dedicated Native job plus analytics asset checking in the
  Python job.

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
