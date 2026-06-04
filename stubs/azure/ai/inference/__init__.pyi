"""Minimal type stubs for ``azure.ai.inference``.

Models only the symbols ``scripts/models/github_models.py`` uses to call the
GitHub Models inference endpoint. See the sibling ``models/__init__.pyi`` for
why these are hand-written. Only the constructor and ``complete()`` call shapes
the script relies on are modeled here.
"""

from collections.abc import Sequence

from azure.ai.inference.models import _ChatRequestMessage
from azure.core.credentials import AzureKeyCredential

class _ResponseMessage:
    """A single message returned in a completion choice.

    Only ``content`` (the generated text, or ``None``) is modeled.
    """

    content: str | None

class _ChatChoice:
    """One choice in a chat completion response.

    Only ``message`` (the assistant's reply, or ``None``) is modeled.
    """

    message: _ResponseMessage | None

class ChatCompletions:
    """Response returned by :meth:`ChatCompletionsClient.complete`.

    Only ``choices`` (the list of generated completions) is modeled.
    """

    choices: list[_ChatChoice]

class ChatCompletionsClient:
    """Client for the GitHub Models chat-completions endpoint.

    Args:
        endpoint: Base URL of the inference endpoint.
        credential: Key-based credential used to authenticate requests.
    """

    def __init__(self, *, endpoint: str, credential: AzureKeyCredential) -> None: ...
    def complete(
        self,
        *,
        messages: Sequence[_ChatRequestMessage],
        model: str = ...,
        max_tokens: int = ...,
    ) -> ChatCompletions:
        """Request a chat completion for the given messages.

        Args:
            messages: The ordered conversation messages to send.
            model: Identifier of the model to run the completion against.
            max_tokens: Upper bound on the number of tokens to generate.

        Returns:
            The :class:`ChatCompletions` response containing the choices.
        """
        ...
