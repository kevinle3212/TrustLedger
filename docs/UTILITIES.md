# Utilities

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
