# GitHub Models

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Commands](#commands)
- [Workflow](#workflow)
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

This document explains the GitHub Models helper scripts and workflow. Read it
when changing model prompts, evaluation scripts, or the `github-models.yml`
workflow.

Script-level usage also lives in `scripts/models/README.md` in the repository
root. The commands below are mirrored here for the docs site.

## Commands

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Install Python dependencies:

```bash
npm run models:install
```

Run all scenarios while skipping the rate-limit probe:

```bash
npm run models:run
```

Run one scenario:

```bash
npm run models:run:summarize
npm run models:run:generate
npm run models:run:qa
npm run models:run:dispute
npm run models:run:risk
npm run models:run:reputation
npm run models:run:mainnet
npm run models:run:incident
```

Run prompt evaluation:

```bash
npm run models:eval
```

## Workflow

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`.github/workflows/github-models.yml` runs on prompt-related pushes, pull
requests, and manual dispatch. It uses `actions/ai-inference@v2`, GitHub Models
CLI evaluation, Python examples, and rate-limit checks. Prompt coverage now
includes contract summarization, release notes, grounded Q&A, edge cases,
mainnet-readiness planning, and operator incident summaries.

Keep prompt files and scripts source-controlled. Do not put API keys or private
test data in prompt files.

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
