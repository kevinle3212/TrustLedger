# Wispr Flow Integration Investigation

| Field              | Value                   |
| ------------------ | ----------------------- |
| Audit type         | general                 |
| Timestamp (UTC)    | 2026-07-01T03:55:43Z    |
| Git branch         | main                    |
| Commit hash        | a2c4dcf                 |
| Repository version | 0.1.0                   |
| Auditor            | Kevin Khanh Le (Claude) |

## Scope

Investigate whether Wispr Flow can be integrated into TrustLedger, and if an
official developer integration or supported tooling exists, document setup and
add optional configuration. Explicitly excludes automatically installing browser
extensions, desktop software, or proprietary services (per request).

## Summary of Findings

Wispr Flow is a **system-level AI voice-dictation application** (macOS/Windows
desktop). It types transcribed speech into whatever text field currently has OS
focus, using the operating system's accessibility layer. It is **not** a web
SDK, browser API, or embeddable component, and there is **no public developer
API/SDK** for a website to call, embed, or configure it.

Consequences for this repository:

- There is **nothing to install or wire in code**. Wispr Flow works with
  TrustLedger's existing forms the moment a user installs and enables it on
  their own machine — the app is provider-agnostic and site-agnostic.
- The most valuable thing the codebase can do is keep inputs **standard and
  accessible** (real `<input>`/`<textarea>`/`contenteditable` with correct
  labels and focus behavior). Dictation tools rely on the same semantics as
  screen readers, so the accessibility audit (see `audits/accessibility/`)
  directly improves Wispr Flow compatibility. No Wispr-specific code is needed.

## Issues Found

| #   | Severity | Issue                                                                                                  | Location                  | Status                 |
| --- | -------- | ------------------------------------------------------------------------------------------------------ | ------------------------- | ---------------------- |
| 1   | Info     | No official Wispr Flow web/embeddable SDK or API exists to integrate; it is an OS-level dictation app. | n/a                       | No change              |
| 2   | Info     | Compatibility depends on standard, accessible form semantics — covered by the accessibility audit.     | `src/components/**` forms | Deferred to a11y audit |

## Fixes Applied

- None. Adding a Wispr-specific integration would invent an unsupported
  dependency, which the request forbids.

## Files Modified

- None.

## Rationale

Building a bespoke "integration" against a product with no public API would be
speculative and unmaintainable, and would violate the instruction not to add
proprietary integrations that require external software. The honest, correct
outcome is to document the manual user setup and rely on accessible markup.

## Recommendations

- Treat Wispr Flow support as an **accessibility outcome**, not a feature: ship
  properly labelled, keyboard-reachable inputs and it works for free.
- If future demand justifies in-browser voice input **without** requiring users
  to install desktop software, evaluate the standards-based **Web Speech API**
  (`SpeechRecognition`) as an optional, self-contained enhancement — no
  proprietary dependency. This is a separate feature, out of scope here.

## Follow-up Actions

- [x] Document the manual user setup below in user-facing docs **if voice input
      is promoted as a supported workflow** — N/A: voice input is not a promoted
      or supported TrustLedger workflow, so the condition is unmet and there is
      nothing to document. Revisit only if in-browser voice input ships as a
      feature (a separate effort, out of scope here).

## Manual Setup (User Steps — not automatable)

1. Install Wispr Flow from the official site on macOS or Windows (user action;
   the repository must not automate this).
2. Grant the OS accessibility/microphone permissions it requests.
3. Focus any TrustLedger text field (e.g. New Contract description) and use the
   Wispr Flow hotkey to dictate. No app configuration is required.

## Remaining Work

- None in-repo. Any future in-browser voice input is a new, separate feature.

## Verification Performed

- Confirmed the repository contains no existing Wispr Flow references or config
  (`grep -ri wispr` — no matches), so there is no stale integration to remove.

### Commands Executed

```bash
grep -ri "wispr" . --exclude-dir=node_modules
```

### Test Results

Not applicable — no code changes.

### Build Status

Not applicable — no code changes.

## Sign-off

- Auditor: Kevin Khanh Le (Claude)
- Reviewed by:
- Date:
