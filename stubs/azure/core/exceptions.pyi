"""Minimal type stub for ``azure.core.exceptions``.

Models only ``HttpResponseError`` as used by
``scripts/models/github_models.py``, which catches it and reads ``status_code``
(for example, to detect HTTP 429 rate limiting). Only that attribute is modeled.
"""

class HttpResponseError(Exception):
    """Raised by the Azure SDK when an HTTP request returns an error response.

    Only ``status_code`` is modeled here, since that is the sole attribute the
    repository reads (to distinguish rate-limit responses from other failures).
    """

    status_code: int | None
