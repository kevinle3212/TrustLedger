---
name: admin-dashboard
description: Maintain TrustLedger admin dashboard, admin auth, operator reports, and audit-safe admin actions.
---

# Admin Dashboard Skill

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Use this skill for changes under `/admin`, `/api/admin`, `src/services/admin*`,
or any operator-only workflow.

## Rules

1. Keep admin pages and APIs server-side gated by `ADMIN_SESSION_SECRET`,
   `ADMIN_API_TOKEN`, `ADMIN_ALLOWED_IPS`, and account configuration.
2. Never commit plaintext passwords, private keys, RPC credentials, email API
   keys, raw user documents, or bearer tokens.
3. Keep read-only mode as the default. Mutating actions require explicit user
   confirmation, persistent audit trails, authorization tests, and docs updates.
4. Bootstrap accounts with `npm run admin:bootstrap`; store only PBKDF2 hashes.
5. Add or update tests in `src/tests/unit/admin-auth.test.ts` for auth changes.
6. Update `docs/ADMIN.md`, `.env.example`, and `TODO.md` when admin scope
   changes.
7. When admin env vars change, run `node tools/sync-env-defaults.mjs` locally
   and update Vercel env for required production keys without printing values.
8. Keep admin UI motion restrained: state feedback, focus affordances, skeletons,
   and read-only warnings only. Avoid decorative page-load choreography.
