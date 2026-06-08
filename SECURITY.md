# Security Policy

This file explains how to report vulnerabilities in TrustLedger. For contract
access control, threat model notes, and current audit status, read
[docs/SECURITY.md](docs/SECURITY.md).

## Supported Scope

Report issues that affect:

- Solidity contracts in `contracts/src/`.
- Deployment and wiring scripts in `contracts/script/` and `scripts/`.
- Frontend wallet, contract interaction, email, notification, or file-handling
  code in `src/`.
- GitHub Actions workflows that handle secrets, deployment, or security
  scanning.

## How To Report

Open a private security advisory in the GitHub repository if you have access. If
you do not have advisory access, contact the repository maintainers privately
before publishing exploit details.

Include:

- Affected files or contract functions.
- Steps to reproduce.
- Expected impact.
- Any transaction hashes, logs, or proof-of-concept snippets that help verify
  the issue.

## Current Audit Status

No third-party audit report is present in this repository as of 2026-06-08.
Treat the contracts as unaudited until an audit report is added.

## Secrets

Never commit `.env`, private keys, API tokens, wallet seed phrases, Vercel
tokens, Resend keys, or bearer secrets. Read [Environment](docs/ENVIRONMENT.md)
for the variables used by this project.
