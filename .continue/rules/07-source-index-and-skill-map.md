---
name: TrustLedger Source Index And Skill Map
alwaysApply: true
---

# Source Index And Skill Map

Use this index when deeper context is needed. Prefer reading the owning source
instead of guessing or duplicating stale guidance.

## Primary Project Instructions

- `AGENTS.md`: precedence, routing, quality gates, code hygiene, UI copy,
  roadmap discipline, task checklists, graphify, fallback, and clarification.
- `CLAUDE.md`: TrustLedger architecture invariants, blocking quality gates,
  branch/commit rules, skills and agents, docs sync, logs/scratch/TODO, and
  Dependabot/code-scanning triage.
- `AGENT-CONTEXT.md`: role-specific scopes, commands, and invariants for
  Principal/Staff, Solutions Architect, DevOps, Security, QA, UX, and Technical
  Writer work.
- `docs/QUALITY-STANDARDS.md`: canonical React Doctor, deployment, performance,
  UI/UX, accessibility, architecture, documentation, API, contract, comment, and
  verification standard.
- `.github/copilot-instructions.md` and `.copilot/instructions.md`: Copilot
  routing, graphify behavior, update-context requirement, quality gates, logs,
  secrets, dependency auditor, SWC, and targeted testing defaults.
- `.cursor/rules/*.mdc`: path-specific frontend, backend, contract, security,
  testing, docs, and graphify rules.
- `~/.claude/CLAUDE.md`: personal operating style, clarification, simplicity,
  surgical changes, goal-driven execution, orchestrator role, fallback, git
  boundaries, gstack, and graphify.
- `~/.codex/AGENTS.md` and `~/.codex/RTK.md`: Codex agent guidance and `rtk`
  command-prefix expectations.

## Review Agents

- `src/.agents/agents/accessibility-reviewer.md`: landmarks, focus, labels,
  contrast, non-color cues, and overflow.
- `src/.agents/agents/dependency-auditor.md`: root/frontend package audits,
  outdated direct dependencies, vulnerability counts, overrides, and workflow
  package checks.
- `src/.agents/agents/documentation-reviewer.md`: changed behavior docs, env
  docs, copy-paste commands, diagrams, and roadmap evidence.
- `src/.agents/agents/frontend-architect.md`: App Router layout, client/server
  boundaries, wallet isolation, local state, and changed-flow tests.
- `src/.agents/agents/performance-reviewer.md`: client bundle size, bounded RPC
  reads, event scans, services, asset sizing, and motion properties.
- `src/.agents/agents/security-reviewer.md`: server-only secrets, validated API
  inputs, bearer routes, safe links, error redaction, security helpers, and
  contract/on-chain review.
- `src/.agents/agents/ui-reviewer.md`: surface vocabulary, hierarchy, responsive
  states, motion restraint, logo, and navigation clarity.

## Project Skills

- `src/.claude/skills/*`: Claude-facing skills for accessibility review,
  dependency audit, documentation review, env sync, frontend architecture,
  Kubernetes, legal compliance, log markdown, performance review, React Doctor,
  and update context.
- `src/.agents/skills/*`: agent-facing skills for dependency audit, env sync,
  eslint strict, knip, Kubernetes, legal compliance, log markdown, Playwright
  accessibility, React Doctor, stylelint, SWC config, TypeScript strict, and
  update context.
- `src/skills/*`: general skills for accessibility, API design, dependency
  audit, documentation, env sync, frontend architecture, Kubernetes, legal
  compliance, Next.js/React, performance, React Doctor, responsive design,
  security, state management, Tailwind/SCSS, log markdown, and update context.
- `.sixth/skills/*`: shared operational skills for admin dashboard, CI green
  gate, dependency audit, env sync, Foundry sandbox, Kubernetes, legal
  compliance, React Doctor, Rust backend, SWC cache, Vercel deploy, log
  markdown, and update context.
- Tool-specific graphify skills also exist under `.agents`, `.claude`, `.codex`,
  `.copilot`, `.gemini`, `.openclaw`, and related agent directories.

## Common Skill Triggers

- Use update-context after repository changes affecting code, config, workflows,
  deployment, website, docs, comments, or agent instructions.
- Use env-sync when env vars are added, removed, renamed, newly required, or
  exposed to Docker, Kubernetes, Vercel, frontend, API, or docs.
- Use legal-compliance for product, frontend, API, wallet, arbitration, risk,
  privacy, cookies, security, or user-policy changes.
- Use dependency-audit for package freshness, vulnerabilities, overrides,
  devDependencies, lockfiles, and package-related workflows.
- Use React Doctor after React code changes and before frontend readiness.
- Use frontend-architecture for route, component, wallet, state, or API
  integration changes.
- Use accessibility-review for forms, navigation, buttons, dialogs, status
  messages, dark mode, contrast, keyboard behavior, and Playwright a11y checks.
- Use performance-review for wallet reads, event scans, rendering loops, assets,
  images, animations, and client bundle dependencies.
- Use log-markdown for all ignored `logs/*.md` run notes and audit summaries.

## Scope Routing

- Frontend: `src/app`, `src/components`, `src/contexts`, `src/hooks`, `src/lib`,
  `src/messages`, and `.cursor/rules/frontend.mdc`.
- Backend/API: `src/app/api`, `src/services`, `src/controllers`, `src/lib/db`,
  and `.cursor/rules/backend.mdc`.
- Contracts: `contracts`, `test`, `contracts/test`, Foundry, Hardhat, and
  `.cursor/rules/contracts.mdc`.
- Security: `SECURITY.md`, `docs/SECURITY.md`, workflows, API routes, contracts,
  `src/security`, `.cursor/rules/security.mdc`, and security agents.
- Testing: `src/tests`, `test`, `contracts/test`, Playwright/Jest config, and
  `.cursor/rules/testing.mdc`.
- Docs: root markdown, `docs/`, `src/README.md`, `AGENT-CONTEXT.md`,
  `CREDITS.md`, `.cursor/rules/docs.mdc`, and documentation skills.
- Infra/DevOps: `.github/workflows`, `docker`, `k8s`, `tools`, Vercel, secrets,
  Docker storage, and Kubernetes skills.

## Practical Default

When starting non-trivial work:

1. Run graphify for orientation.
2. Read the relevant primary instruction and role section.
3. Pick the nearest skill or review agent.
4. Make the smallest production-ready change.
5. Update docs/context if behavior, setup, commands, APIs, env, security,
   deployment, or agent guidance changed.
6. Run targeted checks, then broader gates required by the touched area.
