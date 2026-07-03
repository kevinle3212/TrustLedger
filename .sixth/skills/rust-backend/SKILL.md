---
name: rust-backend
description: Maintain TrustLedger Rust workspace, backend services, strict Cargo configuration, and infrastructure.
---

## Tool Fallback <!-- tool-fallback -->

- If a preferred tool, command, or skill is unavailable, failing, or a worse fit
  for the task, use the best available alternative rather than stopping or
  forcing it. Note which tool you used and why. Never fall back to a prohibited
  tool (for example `mcp__claude-in-chrome__*` is banned — use `/browse`).

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or the
desired outcome is unclear, interview the user with focused questions until intent
is unambiguous. State assumptions and confirm them before proceeding.

# Rust Backend Skill

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today.
> See [`CREDITS.md`](../../../CREDITS.md).

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
