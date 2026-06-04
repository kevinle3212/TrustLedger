# Minimal type stubs for the `azure.ai.inference` symbols used by
# scripts/models/github_models.py. See the sibling models/__init__.pyi for why
# these are hand-written. Only the constructor and `complete()` call shapes the
# script relies on are modeled here.

from collections.abc import Sequence

from azure.ai.inference.models import _ChatRequestMessage
from azure.core.credentials import AzureKeyCredential

class _ResponseMessage:
    content: str | None

class _ChatChoice:
    message: _ResponseMessage | None

class ChatCompletions:
    choices: list[_ChatChoice]

class ChatCompletionsClient:
    def __init__(self, *, endpoint: str, credential: AzureKeyCredential) -> None: ...
    def complete(
        self,
        *,
        messages: Sequence[_ChatRequestMessage],
        model: str = ...,
        max_tokens: int = ...,
    ) -> ChatCompletions: ...
