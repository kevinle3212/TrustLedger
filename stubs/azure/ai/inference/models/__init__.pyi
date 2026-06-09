"""Minimal type stubs for ``azure.ai.inference.models``.

Models only the message types ``scripts/models/github_models.py`` uses. The
Azure AI Inference SDK ships no ``py.typed`` marker and no stubs, so these are
hand-written to cover only the surface this repository exercises  -  enough for
the strict mypy config to type-check our code without an
``ignore_missing_imports`` escape hatch. Extend as needed if the script starts
using more of the SDK.
"""

class _ChatRequestMessage:
    """Base type for a message sent in a chat-completion request.

    Used only as the common supertype for :class:`SystemMessage` and
    :class:`UserMessage`; it carries no public attributes of its own.
    """

class SystemMessage(_ChatRequestMessage):
    """A system-role message that sets context or instructions for the model.

    Args:
        content: The system prompt text.
    """

    def __init__(self, *, content: str) -> None: ...

class UserMessage(_ChatRequestMessage):
    """A user-role message carrying the end user's input.

    Args:
        content: The user prompt text.
    """

    def __init__(self, *, content: str) -> None: ...
