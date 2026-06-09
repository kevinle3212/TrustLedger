# CodeRabbit

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

TrustLedger uses `.coderabbit.yaml` for automated pull-request review guidance.
The configuration is intentionally strict so review comments line up with the
same quality gates enforced by CI.

## Review Policy

- CodeRabbit uses the assertive profile and may request changes.
- Generated, vendored, cache, build, and log directories are excluded from
  review.
- Solidity reviews prioritize reentrancy, access control, event coverage,
  fuzzing, and secret hygiene.
- TypeScript reviews prioritize strict typing, async safety, and secret hygiene.
- Workflow reviews prioritize pinned actions, least-privilege permissions, and
  safe secret access.
- Docker and Kubernetes reviews prioritize reproducible builds, runtime health
  checks, resource limits, security contexts, and no committed secrets.
- Documentation reviews should flag stale commands, undocumented environment
  variables, and examples that expose real credentials.

## Maintenance

Update `.coderabbit.yaml` whenever new high-risk paths are added, especially
deployment manifests, workflows, package-manager files, generated artifacts, or
security-sensitive API routes. Keep this page in sync with those changes.
