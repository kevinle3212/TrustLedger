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
- [Native Kernels](#native-kernels)
- [CI And Hooks](#ci-and-hooks)

<!-- docs-toc:end -->

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

TrustLedger analytics are intentionally privacy-safe. The app surfaces useful
wallet-specific metrics without scraping sensitive wallet or browser data.

## User-Facing Analytics

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The wallet analytics page lives at `/[locale]/analytics`. Connected users can
open it from the wallet address hover menu in the navigation bar or from the
footer Guide.

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
