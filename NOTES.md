# Notes

## Agent Tooling Caveats (2026-06-29)

These caveats cover the local agent tooling (`gstack`, `nexus`, Node, Python)
and the workarounds applied. They are environment/tooling notes, not product
behavior.

### Node version: keep agent tooling on Node 22, not 26

- The machine default is Node `v26.3.1` (Homebrew). It is ahead of several
  native and bundled tools and breaks them:
    - **nexus** — its native `better-sqlite3` (via `@costline/nexus-graph`) is
      compiled per Node ABI. After any Node upgrade it fails with
      `ERR_DLOPEN_FAILED` / MCP error `-32000`. Fix:
      `npm rebuild better-sqlite3`.
    - **gstack setup** — bundled `playwright-core@1.58.2` hangs forever during
      Chromium _extraction_ under Node 26 (its out-of-process download worker
      stalls; download reaches 100%, then no progress). Install the browser
      under Node 22 instead, then re-run `./setup` (it detects the cached
      browser and skips the step):

        ```bash
        PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$PATH" \
          node ~/.claude/skills/gstack/node_modules/.bin/playwright install chromium
        ```

        If it hangs again, the cause is usually a stale
        `~/Library/Caches/ms-playwright/__dirlock` held by no live process —
        remove that file and retry.

### gstack: Cursor host needs manual linking in 1.58.5.0

- `./setup --host cursor` is rejected by the setup wrapper in gstack `1.58.5.0`
  (its host validation omits `cursor`), even though `hosts/cursor.ts` and the
  doc generator fully support it. Codex auto-detect was also unreliable; install
  it explicitly with `./setup --host codex`.
- Cursor was wired manually: `bun run gen:skill-docs --host cursor` stages
  skills under `~/.claude/skills/gstack/.cursor/skills/gstack-*`, then each is
  symlinked into `~/.cursor/skills/gstack-*`.
- This manual wiring is not recreated by `./setup`. After a `/gstack-upgrade`,
  re-run `./setup --host cursor` if the version now supports it, otherwise
  re-link.

### nexus: indexer ignore patterns patched via patch-package

- `@costline/nexus-graph` hardcodes its indexer ignore list and exposes no
  `--ignore` flag, so it logged `parse error … Invalid argument` for generated
  output (e.g. `site/`, the mkdocs build). Patched `IGNORE_PATTERNS`
  (`dist/indexer/indexFile.js`) and the watcher regex
  (`dist/indexer/watcher.js`) to also ignore `**/site/**` and `**/.next/**`.
- The change is durable: `patches/@costline+nexus-graph+0.1.1.patch` is tracked
  and reapplied by the `postinstall` script (`patch-package`). Still-noisy
  generated/vendored paths (`hardhat-cache/`, `contracts/lib/`, large generated
  files like `src/lib/abi.ts`) are caught-and-skipped already and remain
  cosmetic; extend the same patch if you want them silenced.

## Sandbox DNS Handling (2026-06-10)

- The repository cannot directly allowlist DNS from inside source code; sandbox
  DNS policy belongs to the execution environment.
- Non-fatal Reown/Web3Modal metadata fetch warnings during sandboxed builds are
  acceptable only when the frontend build, lint, typecheck, Playwright, and
  Vercel deployment still pass.
- Live network checks for trusted endpoints should use a narrowly scoped
  approved command escalation instead of weakening application code or hiding
  real build failures.

## WalletConnect localStorage Warning and Node Pin (2026-06-24)

- The project targets Node 22 (`engines: >=22.0.0 <23`); use the version manager
  files (`.nvmrc` / `.node-version`, now mirrored in `src/`) and run `nvm use`
  so dev and CI match.
- On Node 24+ the build/SSR step emits an `ExperimentalWarning` that
  `localStorage is not available because --localstorage-file was not provided`.
  Source: `@walletconnect/keyvaluestorage@1.1.1`, whose `dist/index.es.js` reads
  `globalThis.localStorage` at module load; Node 24+ turned that global into a
  getter that warns.
- Fixed with `patch-package`
  (`src/patches/@walletconnect+keyvaluestorage+1.1.1.patch`), which drops the
  `globalThis.localStorage` branch so Node falls back to the in-memory stub
  (pre-Node-24 behavior); browsers still use `window.localStorage`. The patch
  reapplies automatically via the `postinstall` script in `src/package.json`
  after every `npm install`.

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](./CREDITS.md).

Public, shareable working notes for TrustLedger: ideas, research findings, and
decisions that are worth recording but are not yet ready for the formal
documentation in [`docs/`](docs/). Move anything here that the broader community
might benefit from. Keep private or unpolished jotting in `NOTES.local.md`
(git-ignored); promote an entry to this file once it is fit to share.

## Conventions

- Add new entries under the most fitting heading; create a new heading if none
  fits.
- Date entries where the timeline matters (`YYYY-MM-DD`).
- Link out to the relevant code, PRs, issues, or docs.
- When a note matures into formal guidance, move it into `docs/` and leave a
  short pointer here if useful.

## Research and Ideas

Archived in [`docs/NOTES-ARCHIVE.md`](docs/NOTES-ARCHIVE.md).

## Decisions

Archived in [`docs/NOTES-ARCHIVE.md`](docs/NOTES-ARCHIVE.md).

## Phase 6: E2E Messaging + AI Moderation + TOTP 2FA (2026-07-04)

Two Phase 6 features share the off-chain database and the accounts session. Both
keep the chain authoritative; these are supporting off-chain surfaces.

### End-to-end encrypted in-app messaging

**Threat model.** The server is treated as honest-but-curious. It must never be
able to read message plaintext, even transiently at rest, and must not hold any
key that can decrypt a message. It stores only ciphertext, per-wallet public
keys, wrapped private keys, and a content-free moderation flag.

**Primitives** (`src/lib/crypto/e2e.ts`, isomorphic — runs in the browser and in
Node, deliberately not `server-only`): X25519 ECDH for the shared secret,
HKDF-SHA256 to derive keys, and XChaCha20-Poly1305 AEAD for wrapping and message
encryption. Built on the audited `@noble/curves`, `@noble/ciphers`, and
`@noble/hashes`. All binary fields cross the wire as standard base64.

**Key management.** Each wallet generates an X25519 identity client-side. The
private key is wrapped with a key-encryption key (KEK) derived from the wallet's
signature over a fixed, nonce-free EIP-712 message — so the signature (and thus
the KEK) is deterministic and re-derivable on any device, yet the server, which
only stores the wrapped blob + wrap nonce + public key, can never unwrap it. The
raw private key and KEK live only in browser memory for the session and are
re-derived on reload; they are never written to storage.

**Conversation keys.** A one-to-one conversation key is derived from the ECDH
shared secret plus an order-independent salt (the two lowercased addresses
sorted ascending). ECDH commutativity means both participants — and the sender
for their own sent messages — derive the same key. Conversations are keyed by
the normalized, sorted participant pair, so a pair maps to exactly one row.

**Moderation without breaking E2E.** Moderation runs client-side _before_
encryption: the plaintext is sent to a transient `POST /api/messages/moderate`
call (never persisted), classified by the provider-agnostic AI core
(`@/core/ai`), and the result (`allow` | `flag` | `block` + content-free
categories) drives the client. `block` refuses to send; `flag` warns and
attaches a content-free flag; `allow` sends clean. The message is then encrypted
and only the ciphertext + flag reach the server. Moderation is advisory and
**fails open** (returns `allow`) whenever AI is disabled or the call/parse
fails, so it can never become an availability gate on messaging.

Server surface: `src/services/messaging.ts` + `moderation.ts`, repositories
`messagingKeys` / `conversations` / `messages`, routes under `/api/messages/*`.
Models `MessagingKey`, `Conversation`, `Message` (migration
`0003_messaging_totp`). All message routes are participant-gated (403
otherwise).

### Opt-in TOTP two-factor for the off-chain session

`src/services/totp.ts` backs `/api/account/2fa/*` and a session step-up in
`offchainAccounts.ts`. TOTP via `otplib` v13 (functional API: `generateSecret`,
`generateURI`, `verifySync` with `epochTolerance` in seconds — note v13 _throws_
`TokenLengthError` on non-6-digit tokens, so `checkToken` pre-validates the
shape before calling the verifier, letting recovery codes fall through). The
shared secret is stored encrypted with AES-256-GCM under a key derived from
`TOTP_ENCRYPTION_KEY` (base64, required in production; a random per-process key
is used in dev, which makes secrets undecryptable after a restart by design).
Recovery codes are stored only as sha256 hex hashes and consumed one-time.

When a wallet has 2FA enabled, `POST /api/accounts/session` requires a
`totpCode`; without it the route returns `401 { totpRequired: true }` so the
client can prompt for a code and retry. Model `TotpCredential` (migration
`0003_messaging_totp`).

### Build/tooling notes

- `otplib` v13 and its `@otplib/*`, `@scure/base`, and `@noble/*` deps ship
  untranspiled ESM/TS. They are listed in `transpilePackages` in
  `next.config.ts` so the server bundle is valid and `next/jest` (which never
  transforms `node_modules` and only _appends_ custom `transformIgnorePatterns`)
  can transform them under Jest.
- Migration `0003_messaging_totp` is applied to Neon by the database owner, not
  by agents. Run `npm run db:generate` after pulling to regenerate the client.

## Technical Debt

<!--
Packages, patterns, or code that could not be updated or improved yet, and why,
so future contributors are aware of the trade-offs. (For example, dependencies
left at older versions because of deprecation or lack of maintenance.)
-->

## Open Questions

<!-- Things still being figured out. -->
