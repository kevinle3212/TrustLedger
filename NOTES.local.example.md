# Local Notes (Private)

Personal scratch space for rough ideas, research, and reminders. The real file
(`NOTES.local.md`) is git-ignored (see `.gitignore`) and never committed, so you
can jot freely without worrying about polish or completeness.

This is the private counterpart to the committed, public `NOTES.md`. See that
file for the shared notes and conventions: when an entry here is worth sharing
with the broader community, clean it up and move it into `NOTES.md`.

> **How to use this template.** Copy it to `NOTES.local.md`
> (`cp NOTES.local.example.md NOTES.local.md`) and replace everything below with
> your own notes. Never paste real secrets, connection strings, or API keys into
> a committed file — keep those only in `NOTES.local.md` (git-ignored) or your
> secret manager.

## Scratch

<!-- Anything goes: half-formed ideas, links to chase, commands to remember. -->

- Tool/CLI versions worth pinning down: `<e.g. Claude Code vX.Y.Z>`.
- Open question to resolve: `<what you are unsure about>`.

## Environment Setup Notes

Track which env vars a feature needs and where to get them. **Use placeholders
here — put real values only in `NOTES.local.md` or Vercel.** See `.env.example`
for the authoritative list.

### Off-chain database (Neon Postgres)

- `DATABASE_URL` — pooled connection string (host contains `-pooler`). Runtime
  uses this.
- `DIRECT_URL` — direct/unpooled string (same host without `-pooler`). Prisma
  migrate uses this.
- After setting them: `npm run db:generate && npm run db:migrate`.

```dotenv
DATABASE_URL="postgresql://<user>:<password>@<host>-pooler.<region>.aws.neon.tech/<db>?sslmode=require"
DIRECT_URL="postgresql://<user>:<password>@<host>.<region>.aws.neon.tech/<db>?sslmode=require"
```

### AI features

- `<AI provider key>` — provider-agnostic; wire through the config in
  `src/core/ai`, never hardcode a provider in call sites.

```dotenv
OPENAI_API_KEY="<your-key-here>"
```

### Admin IP gate

- `SENSITIVE_ALLOWED_IPS` — your own public IP(s), comma-separated. Empty = no
  restriction (falls back to `ADMIN_ALLOWED_IPS`). Localhost is auto-allowed in
  dev. Find yours with `curl ifconfig.me`.

```dotenv
SENSITIVE_ALLOWED_IPS="203.0.113.4,198.51.100.9"
```

## To Promote to NOTES.md

<!-- Candidates to clean up and move into the public NOTES.md. -->

- `<entry>` — why it matters to the broader project.
