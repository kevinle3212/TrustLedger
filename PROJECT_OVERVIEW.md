# PROJECT_OVERVIEW.md

Canonical, token-efficient reference for humans and AI agents. Deep detail lives
in `docs/` — this file tells you what exists and where to look. For agent
behavior rules, read `AGENTS.md` (precedence) and `CLAUDE.md`.

## What TrustLedger Is

Decentralized escrow and arbitration protocol. **The chain is authoritative**;
the web app, database, and services are supporting infrastructure. Clients and
freelancers create funded escrows; disputes go to juror committees with
commit–reveal voting, appeals, and slashing.

## Architecture

| Layer                   | Where                                                                     | Notes                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Smart contracts (EVM)   | `contracts/src/`                                                          | `TrustLedger.sol` (escrow authority), `Arbitration.sol` (disputes/juries), `JurorRegistry.sol` (stake/locks/slashing), `ReputationRegistry.sol` (ratings), `StakingVault.sol`. Foundry + Hardhat 3. |
| Frontend                | `src/` (standalone Next.js package)                                       | Next.js 16 (App Router, `src/proxy.ts` not middleware), React 19, TypeScript 6, Tailwind 4, next-intl, Reown AppKit + wagmi 2 + viem 2.                                                             |
| API routes              | `src/app/api/`                                                            | Business logic separated into `src/controllers/` and `src/services/`.                                                                                                                               |
| Off-chain DB (optional) | `src/prisma/`, `src/lib/db/`                                              | PostgreSQL on Neon via Prisma 7. Server-only; import `@/lib/db`. App must build/run without `DATABASE_URL` — guard with `isDatabaseConfigured()` + in-memory fallback. Hand-written SQL migrations. |
| AI core                 | `src/core/ai`                                                             | Provider-agnostic (`generateText`/`streamText`); Gemini primary, OpenRouter fallback. Never hardcode a provider at call sites.                                                                      |
| Solana (experimental)   | `programs/solana-escrow`, `programs/solana-staking`, `programs/admin-api` | Rust workspace; see `docs/SOLANA.md`, `programs/AGENTS.md`.                                                                                                                                         |
| Native utilities        | `native/` (C/C++/asm), `lib/`, `utils/`                                   | Supporting tooling.                                                                                                                                                                                 |
| Infra                   | `docker/`, `k8s/`, `infra/`, `.github/workflows/`                         | Docker, Kubernetes manifests, CI/CD.                                                                                                                                                                |

Contract wiring: `Arbitration` alone may lock/unlock/slash in `JurorRegistry`;
`TrustLedger` alone may write ratings to `ReputationRegistry`. Deploy scripts
(`contracts/script/Deploy.s.sol`, `scripts/deploy.ts`) precompute addresses.

Networks: Hardhat 31337, Sepolia 11155111, Arbitrum One 42161, Base 8453,
Optimism 10.

## Core Workflows & Data Flow

- **Escrow lifecycle** — propose (either side) → accept → fund → `ACTIVE` →
  submit proof → approve/dispute → release or arbitration ruling. See
  `docs/ESCROW-LIFECYCLE.md`.
- **Arbitration** — juror committee from `JurorRegistry` (seed from
  `block.prevrandao` when no VRF), commit salted vote → reveal → majority
  rewarded; appeal = larger committee + bond. See `docs/ARBITRATION.md`.
- **Off-chain features** (never custody funds): account sessions (EIP-712
  challenge/response → bearer token, `src/services/offchainAccounts.ts`), opt-in
  TOTP 2FA (`src/services/totp.ts`, AES-256-GCM at rest), E2E-encrypted
  messaging (X25519, wallet-signature-derived KEK; server stores ciphertext only
  — `src/services/messaging.ts`, `src/lib/crypto/e2e`), advisory AI moderation
  (`src/services/moderation.ts`, fails open), IPFS pinning (`/api/ipfs/pin`,
  `PINATA_JWT`), Resend email + deadline-reminder cron
  (`/api/cron/deadline-reminders`, `src/vercel.json`).

## Authentication & Authorization

- Wallet = identity on-chain. Off-chain sessions via EIP-712 signature
  challenge; bearer token cached in `sessionStorage`
  (`src/lib/accountSession.ts`, `src/lib/authedFetch.ts`); optional TOTP
  step-up.
- Magic-link signing in `src/lib/magicLink.ts`.
- `/admin` and `/api/admin/*` are IP-gated by `src/proxy.ts`
  (`SENSITIVE_ALLOWED_IPS`, segments in `SENSITIVE_SEGMENTS`); blocked IPs get a
  branded 404 that never leaks the route.
- Wallet session restore: standalone connectors in `src/lib/wagmi.ts` +
  `WalletSessionRestore` in `src/components/Providers.tsx`. Never add a
  `window.ethereum` `eth_accounts` auto-connect probe; restore stays
  client-only.

## Build, Test, Deploy

- Run frontend commands from `src/`. Key scripts: `dev:frontend`,
  `build:frontend`, `typecheck`, `lint:frontend`, `doctor`, `test`, `test:e2e`,
  `db:generate|db:migrate|db:studio`, `vercel-build` (runs migrations).
- Contracts: `forge test`, `forge build`, `forge fmt --check`, `forge lint`,
  plus Hardhat tests from repo root.
- CI: `.github/workflows/` — `ci.yml`, `deploy.yml`, `security.yml`,
  `react-doctor.yml`, `docs.yml`, `graphify.yml`, `github-models.yml`,
  `dependabot-automerge.yml`, `log-hygiene.yml`, `wiki-sync.yml`, `claude*.yml`.
  See `docs/CI-CD.md`.
- Hosting: Vercel (crons in `src/vercel.json`); Docker/K8s manifests for
  self-hosting. See `docs/DEPLOYMENT.md`, `docs/KUBERNETES.md`.

## Quality Gates (blocking — `docs/QUALITY-STANDARDS.md` is canonical)

From `src/`: `npx tsc --noEmit`, `npm run lint:frontend`, `npm run doctor`
(React Doctor must stay **100/100**). Lighthouse **95+** every category before
deploy. Resolve new warnings at root cause; suppressions need inline
justification. Branch must be green (`forge test`, Hardhat, lint, prettier,
`next build`) before merge; never commit to `main`; commitlint enforces
`type(scope): subject` ≤ 72 chars (see `AGENTS.md` for scopes).

## Environment

`.env.example` (root, canonical) and `.env.local.example`. Key groups: RPC
URLs/chain config, `DATABASE_URL` (optional), `PINATA_JWT`, Resend, AI provider
keys, `TOTP_ENCRYPTION_KEY`, `SENSITIVE_ALLOWED_IPS`. Env-var changes must
update `.env.example` + `docs/ENVIRONMENT.md` in the same change.

## Conventions

- UI copy: Title Case for labels/buttons; sentence case for prose; keep acronyms
  exact (see `AGENTS.md` §UI Copy). Compare locale files against
  `src/messages/en.json` after copy changes.
- TSDoc on new code elements; `controllers/` separation; `CREDITS.md` current.
- Scratch files → project `tmp/`; agent/audit logs → gitignored `logs/` (format
  per `src/.agents/skills/log-markdown/SKILL.md`).
- External fetches/RPC transports need explicit timeouts
  (`src/lib/fetchTimeout.ts`).

## AI Agent Ecosystem (map)

- `AGENTS.md` — cross-agent rules + precedence (read first).
- `AGENT-CONTEXT.md` — role-based directories/commands/invariants.
- `CLAUDE.md` + `.claude/` — Claude Code; `~/.claude/CLAUDE.md` holds global
  prefs (never duplicated in-repo).
- `.codex/AGENTS.md`, `.codex/config.toml`, `.codex/hooks.json` — Codex.
- `GEMINI.md` + `.gemini/` — Gemini CLI (references `AGENTS.md`).
- `.cursor/rules/*.mdc` — Cursor path-scoped rules; `.copilot/`, `.continue/`,
  `.openclaw/` — thin pointers to `AGENTS.md`.
- Skills: shared workflows in `src/.agents/skills/`, review-oriented in
  `src/.claude/skills/`, domain skills in `.sixth/skills/` (admin-dashboard,
  rust-backend, legal-compliance, vercel-deploy…). Review agents in
  `src/.agents/agents/`.
- Knowledge graph: `graphify-out/` — run `graphify query "<question>"` before
  raw browsing; `graphify update .` after meaningful code changes.
- MCP servers (`.mcp.json`): Serena (symbolic code navigation), Nexus
  (project-local code-graph via `scripts/nexus-mcp.js`).

## Known Limitations

- Non-VRF juror selection uses `block.prevrandao`-derived seeds (documented
  trade-off; VRF coordinator optional).
- DB layer is optional by design; features degrade to in-memory fallbacks.
- AI moderation is advisory and fails open.
- Arbitrum Sepolia is not yet a supported deployment target
  (`docs/ARCHITECTURE.md` TODO).
- Solana programs are experimental and not wired into the production app.

See `GAPS.md` for the current defect/debt inventory.
