# Minimal type stubs for the `azure.ai.inference.models` symbols used by
# scripts/models/github_models.py. The Azure AI Inference SDK ships no `py.typed`
# marker and no stubs, so these are hand-written to cover only the surface this
# repository exercises — enough for the strict mypy config to type-check our
# code without an `ignore_missing_imports` escape hatch. Extend as needed if the
# script starts using more of the SDK.

class _ChatRequestMessage: ...

class SystemMessage(_ChatRequestMessage):
    def __init__(self, *, content: str) -> None: ...

class UserMessage(_ChatRequestMessage):
    def __init__(self, *, content: str) -> None: ...
