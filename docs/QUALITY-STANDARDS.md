# Quality Standards

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [1. React Doctor Gate](#1-react-doctor-gate)
- [2. Deployment and Quality Gates](#2-deployment-and-quality-gates)
- [3. Performance and Stability](#3-performance-and-stability)
- [4. UI/UX and Design Consistency](#4-uiux-and-design-consistency)
- [5. Accessibility](#5-accessibility)
- [6. Architecture and Project Structure](#6-architecture-and-project-structure)
- [7. Documentation Standards](#7-documentation-standards)
- [8. API Documentation](#8-api-documentation)
- [9. Smart Contract Documentation](#9-smart-contract-documentation)
- [10. Code Commenting Standards](#10-code-commenting-standards)
- [11. Verification](#11-verification)
- [Authors and Contributors](#authors-and-contributors)
- [Legal](#legal)

<!-- docs-toc:end -->

> **Kevin K. Le** ([LinkedIn](https://linkedin.com/in/lekevin1)) — Founder,
> Founding Engineer, and Current Lead Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon.
>
> **Kellen Snider** — Founding Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon. His vision, ideas, and dedication
> during TrustLedger's Ethereum development were invaluable to the codebase we
> build on today.
>
> See [`CREDITS.md`](CREDITS.md).

Canonical documentation, quality, performance, accessibility, and deployment
standards for TrustLedger. Every AI guidance file — `CLAUDE.md`, `AGENTS.md`,
`.codex/AGENTS.md`, `.github/copilot-instructions.md`, `.cursor/rules/*.mdc`,
Serena, and MCP configuration — must enforce these standards. AI agents must
validate compliance before completing tasks or approving changes, and must
proactively identify and resolve violations.

These standards override convenience but not correctness. For trivial tasks,
apply judgment; never weaken a hard gate (React Doctor, type-check, lint, tests,
build, security) to ship faster.

---

## 1. React Doctor Gate

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- React Doctor must maintain a score of **100/100** at all times.
- No pull request, merge, release, deployment, or production promotion may
  proceed while React Doctor is below 100/100.
- Treat React Doctor failures, warnings, regressions, anti-patterns, and
  recommendations as high-priority issues.
- Whenever code changes, verify the score remains 100/100 and that no new issues
  were introduced. Proactively identify and resolve anything blocking 100/100.
- Run with `npm run doctor` from `src/`; see
  `src/.agents/skills/react-doctor/SKILL.md`.

---

## 2. Deployment and Quality Gates

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Block any deployment, merge, release, or production promotion when any of these
fail:

- React Doctor (`npm run doctor`) below 100/100.
- Type-check (`npx tsc --noEmit`).
- Lint and format (`npm run lint:frontend`, `prettier --check .`,
  `forge fmt --check`, `forge lint`).
- Tests (`forge test`, Hardhat, Jest, Playwright, any others).
- Build validation (`forge build`, `next build`, any other build step).
- Lighthouse below **95** in any category — Performance, Accessibility, Best
  Practices, or SEO. Maintain **95+** before any deployment and target **100**
  where realistically achievable; document any blocker preventing a perfect
  score. Lighthouse CI runs the desktop preset over a 3-run median
  (`src/.lighthouserc.json`).
- Accessibility checks, performance audits, and security checks (`security.yml`,
  Semgrep).

Remove unused code, dead files, stale imports, obsolete assets, duplicate logic,
and unreachable code whenever you modify a surface. Scope discipline still
applies: surface unrelated pre-existing dead code instead of deleting it (see
`CLAUDE.md` §3, root `AGENTS.md` Code Hygiene).

Investigate and resolve new warnings — build, lint, type-check, test, runtime,
browser console, or tooling (including Node experimental warnings) — at their
root cause instead of silencing them. Suppress a finding only when it is a
verified false positive, and always with an inline justification comment.

---

## 3. Performance and Stability

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Audit endpoints, API routes, server actions, hooks, components, smart-contract
  integrations, and background processes for memory leaks, excessive re-renders,
  blocking operations, and resource spikes.
- Prevent UI freezes, hangs, hydration errors, race conditions, infinite loops,
  memory leaks, and excessive CPU or memory consumption.
- Optimize bundle size, rendering performance, caching, lazy loading, code
  splitting, database queries, and network requests.
- Keep external fetches and RPC transports bounded by explicit timeouts; reuse
  `src/lib/fetchTimeout.ts` or a provider-native timeout.
- Verify stable performance on desktop, tablet, mobile, and low-resource
  devices. React Scan (`ReactScanMonitor`) is available in development for
  regression hunting.

---

## 4. UI/UX and Design Consistency

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Audit gradients, fades, overlays, shadows, animations, transitions, and color
  systems. Fix abrupt color cutoffs, inconsistent fades, awkward blending,
  visual artifacts, and styling regressions.
- Keep analytics pages, legal pages, dashboards, forms, modals, and all routes
  at consistent visual polish.
- Verify responsive behavior across every supported breakpoint and device class.
- Maintain a consistent design system, spacing scale, typography hierarchy, and
  interaction patterns. Use the `impeccable` skill for interface design and
  audits.

---

## 5. Accessibility

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Meet WCAG standards where practical.
- Verify color contrast, focus states, keyboard navigation, ARIA attributes,
  semantic HTML, reduced-motion support, screen-reader compatibility, and form
  accessibility.
- Keep all interactive elements accessible across supported devices and input
  methods. See `src/.agents/skills/playwright-a11y/SKILL.md` and
  `src/.agents/agents/accessibility-reviewer.md`.

---

## 6. Architecture and Project Structure

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Maintain a dedicated `controllers/` directory for business-logic separation.
- Maintain a `CREDITS.md` file documenting contributors, libraries, frameworks,
  assets, inspirations, and acknowledgements.
- Enforce clear separation of concerns between UI, services, controllers, API
  routes, contracts, hooks, utilities, and data layers.

---

## 7. Documentation Standards

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Add comprehensive TSDoc to all functions, classes, interfaces, types, hooks,
  utilities, services, controllers, modules, and public APIs.
- Document parameters, return values, exceptions, side effects, examples, and
  usage notes where applicable.
- Keep documentation synchronized with implementation changes in the same PR
  (see `CLAUDE.md` §8).

---

## 8. API Documentation

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Document every API route, endpoint, server action, webhook, middleware,
  request schema, response schema, authentication requirement, validation rule,
  error response, rate limit, and integration flow.
- Maintain accurate OpenAPI/Swagger documentation where applicable.

---

## 9. Smart Contract Documentation

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Fully document contracts, inheritance trees, libraries, interfaces, structs,
  enums, constants, state variables, modifiers, events, custom errors, storage
  layouts, permissions, access controls, and functions.
- Document emitted events, error conditions, state transitions, security
  assumptions, trust boundaries, external integrations, and intended usage
  patterns.
- Explain business logic, economic assumptions, and security considerations for
  each contract component. See `docs/SMART-CONTRACTS.md`.

---

## 10. Code Commenting Standards

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Add meaningful comments where they improve maintainability or explain
  non-obvious behavior.
- Avoid redundant comments that merely restate code.
- Prioritize clarity, maintainability, onboarding efficiency, and long-term
  sustainability.

---

## 11. Verification

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

After modifications, validate and report on:

- React Doctor = 100/100
- Build succeeds
- Type-check passes
- Lint passes
- Tests pass
- Accessibility checks pass
- Mobile responsiveness passes
- No memory spikes, freezes, regressions, warnings, or documentation gaps

Run targeted checks first, then broad gates (see root `AGENTS.md` Runner
Discipline). Report outcomes faithfully: if a check fails or was skipped, say so
with the evidence.

## Authors and Contributors

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **Kevin K. Le** — Founder, Founding Engineer, and Current Lead Engineer
  ([LinkedIn](https://www.linkedin.com/in/lekevin1))
- **Kellen Snider** — Founding Engineer
  ([LinkedIn](https://www.linkedin.com/in/kellen-snider-683396256/))

See [`CREDITS.md`](CREDITS.md) for the complete acknowledgement list.

## Legal

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

This document is part of TrustLedger, an open-source decentralized escrow and
arbitration protocol. Use of this software and documentation is subject to the
[Terms and Conditions](TERMS_AND_CONDITIONS.md),
[Privacy Policy](PRIVACY_POLICY.md), and [Risk Disclosure](RISK_DISCLOSURE.md).
See [`LEGAL.md`](LEGAL.md) for the full compliance and licensing overview.
