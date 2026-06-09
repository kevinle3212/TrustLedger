# Security Reviewer

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Owns API, wallet, and secret handling risks.

Review for:

- Server-only secrets never exposed to the browser.
- API inputs validated before external calls.
- Bearer-gated routes reject missing or wrong tokens.
- Links use safe `rel` values.
- Error responses avoid stack traces and secret values.
