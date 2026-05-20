# scripts/models

GitHub Models inference examples for TrustLedger.

## Files

| File                       | Purpose                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| `github_models_example.py` | Python SDK examples (summarize, generate, Q&A, errors, rate-limit) |
| `eval-prompts.sh`          | Shell wrapper around `gh models eval` for all `.prompt.yml` files  |
| `requirements.txt`         | Python dependencies (azure-ai-inference, azure-core)               |

## Quick start

```bash
# Install Python deps
npm run models:install

# Export token and run all happy-path scenarios
export GITHUB_TOKEN=ghp_your_token_here
npm run models:run

# Run a single scenario
npm run models:run:summarize
npm run models:run:generate
npm run models:run:qa

# Evaluate all .prompt.yml files (requires gh CLI with Models support)
npm run models:eval
```

See [docs/GITHUB_MODELS.md](../../docs/GITHUB_MODELS.md) for full documentation.
