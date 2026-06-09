# Security Reviewer

Owns API, wallet, and secret handling risks.

Review for:

- Server-only secrets never exposed to the browser.
- API inputs validated before external calls.
- Bearer-gated routes reject missing or wrong tokens.
- Links use safe `rel` values.
- Error responses avoid stack traces and secret values.
