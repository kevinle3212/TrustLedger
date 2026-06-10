# scripts/models

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

TrustLedger AI integration via GitHub Models.

## Files

| File               | Purpose                                                           |
| ------------------ | ----------------------------------------------------------------- |
| `github_models.py` | TrustLedger-aware AI scenarios (see table below)                  |
| `eval-prompts.sh`  | Shell wrapper around `gh models eval` for all `.prompt.yml` files |
| `requirements.txt` | Python dependencies (`azure-ai-inference`, `azure-core`)          |

## Scenarios

| Scenario        | What it does                                                                  |
| --------------- | ----------------------------------------------------------------------------- |
| `summarize`     | 2-3 sentence dashboard summary of an `EscrowContract`                         |
| `generate`      | User-facing release notes generated from the live `git log`                   |
| `qa`            | Q&A grounded in contract data - no hallucination outside the provided context |
| `dispute`       | Structured juror guidance (JSON) from a DISPUTED contract's evidence          |
| `risk`          | Pre-creation risk assessment (JSON) of a contract description                 |
| `reputation`    | Narrative reputation summary from a user's rating history                     |
| `mainnet`       | Sanitized mainnet-readiness blocker plan                                      |
| `incident`      | Sanitized operator incident summary for admin review                          |
| `invalid_model` | CI smoke test - confirms `HttpResponseError` on a bad model id                |
| `rate_limit`    | Optional burst probe; passes if any HTTP 429 is seen or all succeed           |

## Quick start

```bash
# Install Python deps
npm run models:install

# Export token and run all scenarios (skip rate-limit burst)
export GITHUB_TOKEN=ghp_your_token_here
npm run models:run

# Run individual scenarios
npm run models:run:summarize
npm run models:run:generate
npm run models:run:qa
npm run models:run:dispute
npm run models:run:risk
npm run models:run:reputation
npm run models:run:mainnet
npm run models:run:incident

# Override the model
python3 scripts/models/github_models.py --scenario dispute --model openai/gpt-4.1-mini

# Evaluate all .prompt.yml files (requires gh CLI with Models support)
npm run models:eval
```

See [docs/GITHUB_MODELS.md](../../docs/GITHUB_MODELS.md) for full documentation.
