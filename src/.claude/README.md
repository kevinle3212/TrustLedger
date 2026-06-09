# Frontend Claude Resources

These resources scope Claude sessions to the TrustLedger frontend and API
surface under `src/`.

## Skills

- [Frontend Architecture](skills/frontend-architecture/SKILL.md)
- [Accessibility Review](skills/accessibility-review/SKILL.md)
- [Performance Review](skills/performance-review/SKILL.md)
- [Documentation Review](skills/documentation-review/SKILL.md)
- [React Doctor](skills/react-doctor/SKILL.md)
- [Dependency Audit](skills/dependency-audit/SKILL.md)
- [Env Sync](skills/env-sync/SKILL.md)
- [Legal Compliance](skills/legal-compliance/SKILL.md)
- [Log Markdown](skills/log-markdown/SKILL.md)

## Operating Rules

- Keep wallet code in `lib/wagmi.ts`, `components/ConnectButton.tsx`, or focused
  hooks.
- Keep user-visible copy localized through `messages/*.json`.
- Validate API boundaries in `app/api/**` before calling services.
- Run `npx tsc --noEmit`, `npm run lint:frontend`, targeted Jest tests, and
  React Doctor after React changes.
- Write agent run logs, audit summaries, and issue notes to ignored `logs/`.
