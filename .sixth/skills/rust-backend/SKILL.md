---
name: rust-backend
description: Maintain TrustLedger Rust workspace, backend services, strict Cargo configuration, and infrastructure.
---

# Rust Backend Skill

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Use this skill for `.cargo/`, `Cargo.toml`, `lib/`, `programs/`, and
`infra/rust-*` changes.

## Rules

1. Keep `unsafe_code = "forbid"` and warnings denied.
2. Run `npm run rust:fmt`, `npm run rust:clippy`, and `npm run rust:test` after
   Rust changes.
3. Keep services read-only until auth, persistence, audit logging, and threat
   model updates are complete.
4. Do not place secrets in Dockerfiles, Kubernetes manifests, examples, or tests.
5. Document new service routes in `docs/ADMIN.md` or a dedicated service doc.
6. Keep directory guidance synchronized in `infra/AGENTS.md`, `lib/AGENTS.md`,
   and `programs/AGENTS.md` when backend ownership changes.
7. Use `tools/sync-env-defaults.mjs` after adding Rust service env vars so
   ignored local env files receive missing non-overwriting defaults.
