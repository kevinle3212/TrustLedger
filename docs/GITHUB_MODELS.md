# GitHub Models — prompts and CI

TrustLedger includes [GitHub Models](https://github.com/marketplace/models)
`.prompt.yml` files for the Models playground, local evaluation, and GitHub
Actions. They double as copy-paste examples for Python, JavaScript, and workflow
integrations.

## Files

| File                                          | Purpose                                                |
| --------------------------------------------- | ------------------------------------------------------ |
| `.github/prompts/summarize-text.prompt.yml`   | Summarize escrow/support text                          |
| `.github/prompts/generate-text.prompt.yml`    | Generate release-note style copy                       |
| `.github/prompts/answer-questions.prompt.yml` | Q&A grounded in provided context                       |
| `.github/prompts/edge-cases.prompt.yml`       | Empty input handling                                   |
| `scripts/models/github_models.py`             | Python SDK examples (summarize, generate, Q&A, errors) |
| `.github/workflows/github-models.yml`         | CI workflow                                            |

## npm scripts (repo root)

| Script                                          | Command                                                  |
| ----------------------------------------------- | -------------------------------------------------------- |
| Install Python deps                             | `npm run models:install`                                 |
| Run all Python examples (skip rate-limit burst) | `npm run models:run`                                     |
| Summarize scenario only                         | `npm run models:run:summarize`                           |
| Generate scenario only                          | `npm run models:run:generate`                            |
| Q&A scenario only                               | `npm run models:run:qa`                                  |
| Evaluate all `.prompt.yml` files                | `npm run models:eval` (requires `gh` + `gh models eval`) |

Requires `GITHUB_TOKEN` in the environment for Python scripts.

## Prerequisites

- GitHub account with access to
  [GitHub Models](https://github.com/marketplace/models)
- `GITHUB_TOKEN` with `models: read` (workflow sets this automatically)
- Python 3.12+ for `npm run models:*` (install deps via
  `npm run models:install`)
- Optional: [GitHub CLI](https://cli.github.com/) with Models support for
  `npm run models:eval`

## Playground (UI)

1. Open your repo on GitHub → **Models** (or use the Models marketplace).
2. Import or open a `.prompt.yml` from `.github/prompts/`.
3. Run comparisons and evaluators from the Prompt view.

## Local evaluation (CLI)

```bash
gh models eval .github/prompts/summarize-text.prompt.yml
gh models eval .github/prompts/summarize-text.prompt.yml --json
```

Auto-generate test cases:

```bash
gh models generate .github/prompts/summarize-text.prompt.yml
```

## Python example (Azure AI Inference SDK)

> **Note**: `azure-ai-inference` is still in preview (`1.0.0b*`).
> `requirements.txt` pins `>=1.0.0b1` — there is no stable `1.0.0` release yet.

Same endpoint as the Models docs; uses `GITHUB_TOKEN`:

```bash
pip install -r scripts/models/requirements.txt
export GITHUB_TOKEN=ghp_your_token_here
python scripts/models/github_models.py --scenario summarize
python scripts/models/github_models.py --scenario all --skip-rate-limit
```

Minimal inline example:

```python
import os
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential

endpoint = "https://models.github.ai/inference"
model = "openai/gpt-4.1"
token = os.environ["GITHUB_TOKEN"]

client = ChatCompletionsClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(token),
)

response = client.complete(
    messages=[
        SystemMessage(content="Summarize in one sentence starting with 'Summary -'."),
        UserMessage(content="The escrow timed out before the freelancer submitted work."),
    ],
    model=model,
    max_tokens=128,
)
print(response.choices[0].message.content)
```

## GitHub Actions

Workflow:
[`.github/workflows/github-models.yml`](../.github/workflows/github-models.yml)

- **prompt-files** — `actions/ai-inference@v1` runs each `.prompt.yml` with
  sample `input`.
- **evaluate-prompts** — `gh models eval` when the CLI supports it.
- **python-examples** — runs `github_models.py` (happy paths).
- **error-handling** — invalid model id must fail.
- **rate-limit-probe** — optional burst on `workflow_dispatch` (may see HTTP
  429).

Run manually: **Actions → GitHub Models prompts → Run workflow**.

### actions/ai-inference snippet

```yaml
permissions:
    models: read

steps:
    - uses: actions/checkout@v6
    - uses: actions/ai-inference@v1
      with:
          prompt-file: .github/prompts/summarize-text.prompt.yml
          # Pass template variables as a single-line quoted YAML scalar.
          # Multi-line block scalars or unquoted values containing ":" break
          # the YAML parser inside the action.
          input: 'input: "Client disputes late delivery on contract #42."'
          endpoint: https://models.github.ai/inference
          model: openai/gpt-4.1
          token: ${{ secrets.GITHUB_TOKEN }}
```

## Error handling covered

| Case                     | How it is tested                                                   |
| ------------------------ | ------------------------------------------------------------------ |
| Empty / whitespace input | `edge-cases.prompt.yml` + evaluators                               |
| Invalid model id         | `error-handling` job + `invalid_model` Python scenario             |
| Rate limiting            | `rate_limit` Python burst (optional; 429 is environment-dependent) |
| Missing token            | Run without `GITHUB_TOKEN` — client exits immediately              |

## Related docs

- [Home](Home.md) — documentation index
- [CONTRIBUTING.md](CONTRIBUTING.md) — local setup including `npm run models:*`
- [TESTING.md](TESTING.md) — CI and manual testing
- [Evaluating AI models](https://docs.github.com/en/github-models/use-github-models/evaluating-ai-models)
  (GitHub Docs)
- [Storing prompts in repositories](https://docs.github.com/en/github-models/use-github-models/storing-prompts-in-github-repositories)
  (GitHub Docs)
- [actions/ai-inference](https://github.com/actions/ai-inference)
