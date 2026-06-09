# Utilities

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

This document covers utility scripts and helper assets outside the main frontend
and contract packages.

## Contract Generator

`utils/generate_contract.py` generates a professional freelance service
agreement PDF for demos and exposes reusable template data for future workflows.

### Function

```python
generate_contract_template(
    agreement_id="TL-DEMO-0001",
    effective_date="May 26, 2026",
    client=None,
    freelancer=None,
    scope_of_work=None,
    escrow_amount="1.00 ETH",
    arbitration_fee="5% (held only if a dispute is opened)",
    warranty_holdback="10% for 30 days after approval",
    acceptance_window="48 hours after work submission",
)
```

The returned `ContractTemplate` includes:

- Configurable parties.
- Scope of work.
- Payment and escrow terms.
- Deliverables and deadlines.
- Intellectual property clause.
- Confidentiality clause.
- Termination clause.
- Dispute-resolution clause.
- Signature sections.

### Generate The Demo PDF

```bash
python3 utils/generate_contract.py
```

Output:

```text
utils/sample-contract.pdf
```

## Python Tooling

Python checks use strict mypy settings from `mypy.ini`.

```bash
npm run lint:py
```

Runtime dependencies:

- `utils/requirements.txt` for ReportLab and stubs.
- `scripts/models/requirements.txt` for GitHub Models integration.

See [Type Stubs](STUBS.md) for the hand-written Azure SDK stubs.

## Log Retention

Agent run notes, dependency audits, Impeccable notes, and transient issue
summaries belong in ignored `logs/` as Markdown. They should be useful
summaries, not raw terminal dumps.

npm is configured through `.npmrc` to write npm debug logs under `logs/npm`.
Those files are ignored by git; summarize important npm failures in
markdownlint-compliant `logs/*.md` notes when an agent run needs a durable local
record.

Check retention and Markdown policy:

```bash
npm run logs:check
npm run lint:logs
```

Prune old or oversized local logs:

```bash
npm run logs:prune
```

Default retention limits:

| Setting                  |         Default | Environment override             |
| ------------------------ | --------------: | -------------------------------- |
| Maximum files            |              25 | `TRUSTLEDGER_LOG_MAX_FILES`      |
| Maximum total size       | 2,000,000 bytes | `TRUSTLEDGER_LOG_MAX_BYTES`      |
| Maximum single file size |   500,000 bytes | `TRUSTLEDGER_LOG_MAX_FILE_BYTES` |
| Maximum age              |         30 days | `TRUSTLEDGER_LOG_MAX_AGE_DAYS`   |

`logs:check` is non-destructive and fails when `logs/` exceeds policy.
`logs:prune` removes stale, oversized, and oldest excess files until the local
directory is back under the same limits.

## Cross-Platform Script Support

TrustLedger's primary automation uses Bash because the project depends on
Foundry, Hardhat, Docker, and Unix-like CI runners. Supported runtimes:

- macOS Terminal or zsh with Bash available.
- Linux shells.
- Windows WSL2, recommended for full contract/backend workflows.
- Windows Git Bash/MSYS2, supported for utility scripts when dependencies are
  installed.
- Windows PowerShell, supported for selected utility wrappers.

Bash utilities:

```bash
bash tools/keep-awake.sh --minutes 30 -- npm run foundry:test
bash tools/remove-duplicates.sh --max-depth 3 .
```

PowerShell equivalents:

```powershell
powershell -ExecutionPolicy Bypass -File tools/keep-awake.ps1 -Minutes 30 npm run foundry:test
powershell -ExecutionPolicy Bypass -File tools/remove-duplicates.ps1 -MaxDepth 3 .
```

For full setup on Windows, use WSL2:

```powershell
wsl --install -d Ubuntu
```
