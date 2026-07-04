# Database

Off-chain PostgreSQL layer for TrustLedger (Prisma 7 + the node-postgres driver
adapter, hosted on Neon). The blockchain remains the source of truth; this
database only holds off-chain metadata that is impractical or too expensive to
keep on-chain: cached contract listings, dispute-evidence pointers, juror
analytics, notification records, account preferences, and privacy-preserving
aggregate counters.

## Layout

This folder is the human-facing home for database assets. To avoid drift, the
schema and migrations are **symlinks** to the canonical Prisma location that the
build and `prisma` CLI already expect:

| Path                     | Points to                  | Purpose                          |
| ------------------------ | -------------------------- | -------------------------------- |
| `database/schema.prisma` | `src/prisma/schema.prisma` | Canonical Prisma schema          |
| `database/migrations/`   | `src/prisma/migrations/`   | SQL migration history            |
| `database/verify.mjs`    | —                          | Connectivity + schema smoke test |
| `db/`                    | `database/`                | Short alias                      |

The generated client lives at `src/lib/generated/prisma` (git-ignored) and the
server-only client/repositories live at `src/lib/db/` (import from `@/lib/db`).

## Configuration

Connection strings come from the environment — never hardcode credentials:

- `DATABASE_URL` — pooled connection used by the application at runtime.
- `DIRECT_URL` — direct (non-pooled) connection used by `prisma migrate`. For
  Neon this is the `DATABASE_URL` host **without** the `-pooler` segment.

Both live in the repository-root `.env` and are mirrored into `src/.env.local`
(git-ignored) because Next.js runs from `src/` and does not read the root
`.env`.

## Commands

Run from `src/` (where `prisma.config.ts` lives):

```bash
npm run db:generate      # regenerate the Prisma client
npm run db:migrate       # prisma migrate deploy (apply pending migrations)
npm run db:migrate:dev   # create + apply a new migration in development
npm run db:studio        # open Prisma Studio

node ../database/verify.mjs   # connectivity + schema smoke test
```

## Seeding

There is intentionally **no data seed**. Every row in this database is derived
from on-chain events or authenticated user actions (contracts, disputes, juror
votes, notifications, account preferences, aggregate analytics), so seeding
fabricated rows would create data that contradicts the chain. `verify.mjs`
confirms connectivity and that the expected tables exist instead.
