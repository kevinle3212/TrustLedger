# Frontend Security Toolkit (`src/security/`)

A single import surface for the TrustLedger frontend's security helpers. Reach
for these instead of hand-rolling clipboard, header, sanitization, or address
logic. Contract / on-chain security tooling lives in the repo-root
[`security/`](../../security/README.md) directory.

```ts
import { copyToClipboard, sanitizeUrl, validateEthAddress } from "@/security";
```

## Modules

| File           | Exports                                                                                | Purpose                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `clipboard.ts` | `copyToClipboard`, `isClipboardAvailable`                                              | Best-effort copy that never throws on insecure origins / in-app webviews (where `navigator.clipboard` is `undefined`).        |
| `headers.ts`   | `SECURITY_HEADERS`, `applySecurityHeaders`, `buildContentSecurityPolicy`               | Baseline HTTP security headers + CSP. Consumed by `src/proxy.ts`; reusable in route handlers.                                 |
| `rateLimit.ts` | `createRateLimiter`, `RateLimiter`                                                     | Reusable in-memory fixed-window limiter. Backs the `/api/*` limit in `src/proxy.ts`.                                          |
| `csrf.ts`      | `isSameOriginRequest`                                                                  | Origin check for state-changing API routes (defense in depth).                                                                |
| `sanitize.ts`  | `escapeHtml`, `stripControlChars`, `sanitizeText`, `sanitizeUrl`, `sanitizeFileName`   | Conservative, dependency-free sanitizers for non-React sinks.                                                                 |
| `address.ts`   | `toChecksumAddress`, `addressesEqual`, `isEvmAddress`, `isZeroAddress`, `ZERO_ADDRESS` | Never-throwing EVM address checksum/equality helpers.                                                                         |
| `index.ts`     | (barrel)                                                                               | Re-exports all of the above plus existing `@/lib/validation` validators and `@/lib/encryption` (`encryptFile`/`decryptFile`). |

## Conventions

- **Never throw on user-triggered actions.** Clipboard, URL parsing, and address
  parsing return `boolean` / `undefined` instead of throwing, so a click handler
  can't crash the UI (the original "click to copy freezes" class of bug).
- **Re-export, don't move.** Existing security code (`validation.ts`,
  `encryption.ts`) stays where it is; this directory re-exports it so there is
  one place to look without churning imports across the app.
- **Wired in, not speculative.** Each helper has at least one real call site
  (e.g. `copyToClipboard` backs all three copy buttons; `headers`/`rateLimit`
  back `proxy.ts`).

## Where the policy is enforced

- **HTTP headers + CSP + API rate limiting** → `src/proxy.ts` (runs before every
  matched request).
- **CI scanning** → `.github/workflows/security.yml` (Semgrep + gitleaks).
- **Field validation** → `@/lib/validation` (re-exported here).
- **At-rest file encryption** → `@/lib/encryption` (AES-GCM via Web Crypto).
