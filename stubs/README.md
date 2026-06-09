# TrustLedger Type Stubs

This directory contains first-party `.pyi` files for third-party Python packages
that do not ship usable type information.

## Purpose

`scripts/models/github_models.py` uses the Azure AI Inference SDK. The SDK is
runtime-installable, but the package does not provide enough static typing for
the repository's strict `mypy.ini` settings. The files under `stubs/azure/**`
model only the SDK symbols TrustLedger imports.

## How Stubs Work

`mypy.ini` sets:

```ini
mypy_path = stubs
```

That tells mypy to resolve `azure.*` imports against this directory during
static analysis. Runtime imports still come from the installed packages in
`scripts/models/requirements.txt`.

## Generation Workflow

These stubs are maintained manually because the project only needs a small API
surface:

1. Read the runtime import in `scripts/models/github_models.py`.
2. Add the minimum class, function, attribute, and return types to the matching
   `.pyi` file.
3. Run `npm run lint:py` from the repository root.
4. Keep the stub narrower than the full SDK unless a new source file requires
   more symbols.

## Consumption Workflow

Developers do not import from `stubs/` directly. Import the real package:

```python
from azure.ai.inference import ChatCompletionsClient
```

Mypy reads the stub. Python runs the installed Azure package.

## Development Workflow

When adding a new Python dependency:

- Prefer a dependency that ships `py.typed`.
- Prefer official or community type stubs when they are maintained.
- Add hand-written stubs only for small, stable API slices.
- Document every new stubbed package in this README.

## Best Practices

- Keep stubs minimal and exact.
- Avoid `Any`; strict mypy settings reject explicit and imported `Any`.
- Mirror only public attributes used by first-party code.
- Update stubs and source together.
- Run `npm run lint:py` before committing.

## Troubleshooting

| Problem                                      | Fix                                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `Cannot find implementation or library stub` | Confirm `mypy_path = stubs` and the package path mirrors the import.                      |
| `Module has no attribute`                    | Add the missing symbol to the relevant `.pyi` file.                                       |
| Runtime import fails                         | Install runtime dependencies from `scripts/models/requirements.txt`; stubs are type-only. |
| Mypy reports `Any`                           | Replace broad stub fields with concrete protocols, classes, or typed containers.          |

## Related Documentation

- [Python tooling](../docs/UTILITIES.md#python-tooling)
- [GitHub Models](../docs/GITHUB_MODELS.md)
- [Environment](../docs/ENVIRONMENT.md)
