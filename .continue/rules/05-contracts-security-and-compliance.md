---
name: TrustLedger Contracts Security And Compliance
globs:
    - "contracts/src/**/*"
    - "contracts/test/**/*"
    - "contracts/script/**/*"
    - "test/**/*"
    - "src/security/**/*"
    - "src/app/api/**/*"
    - "SECURITY.md"
    - "docs/SECURITY.md"
    - "docs/LEGAL.md"
    - "src/content/legal/**/*"
    - ".github/workflows/**/*"
alwaysApply: false
---

# Contracts, Security, And Compliance

- Prioritize escrow safety, access control, reentrancy resistance, event
  coverage, gas awareness, invariant clarity, and audit-ready design.
- Solidity compiler warnings are build errors. Do not change `via_ir = true`,
  optimizer settings, fuzz run counts, or lint severity policy without explicit
  justification and matching validation.
- Smart-contract changes require matching Foundry tests. Storage mutations,
  access-control changes, escrow flows, randomness, and arbitration transitions
  need focused unit or invariant coverage.
- Use OpenZeppelin audited primitives for access control, reentrancy protection,
  and pausability. Do not roll custom security primitives without explicit
  design review.
- Do not introduce upgradeability, oracle dependencies, privileged roles, token
  assumptions, or new trust boundaries without docs and tests.
- For contract PR readiness, run or recommend Foundry, Hardhat, lint, build,
  gas, Slither, and Semgrep checks as applicable.
- The CSRF and security helper layer lives in `src/security/`. Review changes
  against `docs/SECURITY.md` and the security skill before merge.
- Keep bearer secrets, RPC keys, email tokens, webhook secrets, private keys,
  deployment credentials, and wallet material server-only.
- Fix Gitleaks findings instead of allowlisting unless the value is confirmed
  public and non-secret. Keep allowlists exact and scoped.
- Error responses must not leak stack traces, private keys, tokens, internal
  file paths, raw provider secrets, or detailed authorization internals.
- Use `src/.agents/agents/security-reviewer.md` for security reviews and
  `src/.agents/agents/dependency-auditor.md` for dependency/vulnerability work.
- Use dependency audit skills before package upgrades, overrides, or workflow
  changes touching package checks.
- Legal or compliance-sensitive work includes product claims, wallet behavior,
  arbitration, risk, privacy, cookies, user policies, sanctions, taxes, security
  posture, or legal-center copy.
- Privacy or cookie changes must update `src/content/legal/PRIVACY_POLICY.md`,
  `src/content/legal/COOKIE_POLICY.md`, and any relevant consent or cookie
  inventory code in the same branch. Claim only functionality that exists.
- Do not edit root legal draft markdown files without explicit approval. Keep
  legal review notes separate when owner review is needed.
