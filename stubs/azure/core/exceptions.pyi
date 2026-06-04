# Minimal type stub for `azure.core.exceptions.HttpResponseError` as used by
# scripts/models/github_models.py, which catches it and reads `status_code`
# (e.g. to detect HTTP 429 rate limiting). Only that attribute is modeled.

class HttpResponseError(Exception):
    status_code: int | None
