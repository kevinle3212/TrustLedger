"""Minimal type stub for ``azure.core.credentials``.

Models only ``AzureKeyCredential`` as used by
``scripts/models/github_models.py`` (key-based auth against the GitHub Models
endpoint). Only the constructor is modeled.
"""

class AzureKeyCredential:
    """Wraps an API key for key-based authentication with Azure clients.

    Args:
        key: The secret API key used to authenticate requests.
    """

    def __init__(self, key: str) -> None: ...
