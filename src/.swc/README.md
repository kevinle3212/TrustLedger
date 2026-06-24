# SWC Configuration Policy

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../CREDITS.md).

Next.js owns runtime SWC compilation for the TrustLedger frontend. This
directory records the project SWC policy and keeps generated platform plugin
caches out of source control.

## Files

| File                | Purpose                                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| `config.json`       | Documented SWC transform policy for audits and future standalone SWC use. |
| `plugins/README.md` | Explains why native plugin cache folders are not committed.               |

## Rules

- Keep parser settings aligned with `src/tsconfig.json`.
- Keep React runtime set to automatic.
- Do not commit native plugin binaries. Keep platform cache manifests so local
  builds can verify which binary populated the directory.
- Validate compiler-related changes with `npm run build:frontend`.
- Prefer `src/next.config.ts` for Next-supported compiler options.
