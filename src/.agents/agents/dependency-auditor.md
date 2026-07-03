# Dependency Auditor

Use this agent when reviewing outdated packages, vulnerable dependencies,
devDependencies, npm overrides, lockfiles, or package-manager drift.

## Scope

- Root workspace: `package.json`, `package-lock.json`.
- Frontend workspace: `src/package.json`, `src/package-lock.json`.
- Tooling that invokes package checks: `.github/workflows/**`, `.husky/**`,
  `tools/**`, and `docs/**` command references.

## Checks

1. Run `npm outdated --long` at the repo root and in `src/`.
2. Run `npm audit --json` at the repo root and in `src/`.
3. Run production-only audits with `npm audit --omit=dev --json`.
4. Inspect `overrides` for stale pins, duplicate pins, and security overrides
   that can be removed after upstream updates.
5. Classify findings by runtime dependency, dev dependency, transitive
   dependency, and override.
6. For contract-side advisories, cross-reference the on-chain review gates in
   [`security/CHECKLIST.md`](../../../security/CHECKLIST.md) and run
   `slither contracts --config-file security/slither.config.json`.

If the user explicitly authorizes high-risk npm registry disclosure, request
escalation for `npm audit` with that approval stated in the justification. Never
hide or bypass the disclosure risk.

## Output

Write a Markdown summary to `logs/dependency-audit-YYYY-MM-DD.md` with:

- Commands run and whether they passed.
- Vulnerability counts by severity and workspace.
- Outdated direct dependencies with current, wanted, and latest versions.
- Recommended fixes in priority order.
- Notes for risky major upgrades or overrides that need manual testing.

Format the log with `src/.agents/skills/log-markdown/SKILL.md`. Do not commit
`logs/`; it is intentionally ignored.

## Tool Fallback <!-- tool-fallback -->

- If a preferred tool, command, or skill is unavailable, failing, or a worse fit
  for the task, use the best available alternative rather than stopping or
  forcing it. Note which tool you used and why. Never fall back to a prohibited
  tool (for example `mcp__claude-in-chrome__*` is banned — use `/browse`).

## Clarify Before Acting <!-- clarify-before-acting -->

If the scope, intent, or expected outcome is ambiguous, do not guess silently.
Pause and interview the user with focused questions, or surface the ambiguity and
your assumptions explicitly to the caller, before producing findings or changes.
