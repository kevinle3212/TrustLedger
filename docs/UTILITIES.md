# Utilities

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Contract Generator](#contract-generator)
    - [Function](#function)
    - [Generate The Demo PDF](#generate-the-demo-pdf)
- [Python Tooling](#python-tooling)
- [Log Retention](#log-retention)
- [Cross-Platform Script Support](#cross-platform-script-support)
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

This document covers utility scripts and helper assets outside the main frontend
and contract packages.

## Contract Generator

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`utils/generate_contract.py` generates a professional freelance service
agreement PDF for demos and exposes reusable template data for future workflows.

### Function

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

```bash
python3 utils/generate_contract.py
```

Output:

```text
utils/sample-contract.pdf
```

## Python Tooling

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Python checks use strict mypy settings from `mypy.ini`.

```bash
npm run lint:py
```

Runtime dependencies:

- `utils/requirements.txt` for ReportLab and stubs.
- `scripts/models/requirements.txt` for GitHub Models integration.

See [Type Stubs](STUBS.md) for the hand-written Azure SDK stubs.

## Log Retention

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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
npm run tmp:check
```

Prune old or oversized local logs:

```bash
npm run logs:prune
npm run tmp:prune
npm run docker:storage:prune
```

Default log retention limits:

| Setting                  |         Default | Environment override             |
| ------------------------ | --------------: | -------------------------------- |
| Maximum files            |              25 | `TRUSTLEDGER_LOG_MAX_FILES`      |
| Maximum total size       | 2,000,000 bytes | `TRUSTLEDGER_LOG_MAX_BYTES`      |
| Maximum single file size |   500,000 bytes | `TRUSTLEDGER_LOG_MAX_FILE_BYTES` |
| Maximum age              |         30 days | `TRUSTLEDGER_LOG_MAX_AGE_DAYS`   |

`logs:check` is non-destructive and fails when `logs/` exceeds policy.
`logs:prune` removes stale, oversized, and oldest excess files until the local
directory is back under the same limits.

Temporary scratch files belong in ignored project-local `tmp/`, not system
`/tmp`, unless an external tool requires otherwise. Use
`TRUSTLEDGER_TMP_DIR=./tmp` when a command accepts an explicit temporary root.

Default tmp retention limits:

| Setting                  |          Default | Environment override             |
| ------------------------ | ---------------: | -------------------------------- |
| Maximum files            |              100 | `TRUSTLEDGER_TMP_MAX_FILES`      |
| Maximum total size       | 50,000,000 bytes | `TRUSTLEDGER_TMP_MAX_BYTES`      |
| Maximum single file size | 10,000,000 bytes | `TRUSTLEDGER_TMP_MAX_FILE_BYTES` |
| Maximum age              |           7 days | `TRUSTLEDGER_TMP_MAX_AGE_DAYS`   |

`tmp:check` is non-destructive and fails when `tmp/` exceeds policy. `tmp:prune`
removes stale, oversized, and oldest excess files until the local directory is
back under the same limits.

Docker storage retention is checked with:

```bash
npm run docker:storage:check
```

`docker:storage:check` is non-destructive and fails when Docker reports storage
above the 5 GB default threshold. `docker:storage:prune` runs
`docker system prune -a --volumes -f` only when storage exceeds that threshold.
Override the threshold with `TRUSTLEDGER_DOCKER_MAX_BYTES`.

## Cross-Platform Script Support

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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
