# GitHub Models

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

This document explains the GitHub Models helper scripts and workflow. Read it
when changing model prompts, evaluation scripts, or the `github-models.yml`
workflow.

Script-level usage also lives in `scripts/models/README.md` in the repository
root. The commands below are mirrored here for the docs site.

## Commands

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
```

Run prompt evaluation:

```bash
npm run models:eval
```

## Workflow

`.github/workflows/github-models.yml` runs on prompt-related pushes, pull
requests, and manual dispatch. It uses `actions/ai-inference@v2`, GitHub Models
CLI evaluation, Python examples, and rate-limit checks.

Keep prompt files and scripts source-controlled. Do not put API keys or private
test data in prompt files.
