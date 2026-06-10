# Analytics And Native Kernels

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

TrustLedger analytics are intentionally privacy-safe. The app surfaces useful
wallet-specific metrics without scraping sensitive wallet or browser data.

## User-Facing Analytics

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

`GET /api/analytics/wallet/[address]` validates the wallet address and returns
privacy-boundary metadata for integrations or smoke tests.

The endpoint intentionally does not fetch third-party wallet data. It returns a
deterministic public fingerprint and lists which public/local signal categories
the frontend is allowed to use.

## Python Visualizations

Phase 6 analytics visual support lives in `scripts/analytics/`.

```sh
npm run analytics:generate
npm run analytics:check
```

The committed preview lives at `assets/analytics/wallet-analytics-preview.svg`.
The default generator uses only Python standard-library SVG output so CI stays
fast. Optional local experiments can install:

```sh
python3 -m pip install -r scripts/analytics/requirements.txt
```

Do not commit generated visuals that include private keys, seed phrases, emails,
raw documents, encrypted draft bodies, or session keys.

## Native Kernels

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

The following gates keep analytics artifacts and native kernels healthy:

- Pre-commit: duplicate scan, `native:check`, and `analytics:check`.
- Pre-push: duplicate scan, `native:check`, and `analytics:check`.
- GitHub Actions: dedicated Native job plus analytics asset checking in the
  Python job.
