# Analytics Visualization Scripts

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

These scripts support Phase 6 analytics and visualization work. They generate
privacy-safe charts from aggregate, public, or synthetic wallet metrics for
docs, whitepaper drafts, and frontend design references.

The default generator uses only the Python standard library so CI and local
checks stay fast. Install `requirements.txt` only when building richer
Matplotlib or NumPy reports locally.

## Commands

```sh
npm run analytics:generate
npm run analytics:check
```

Generated visuals must not include private keys, seed phrases, emails, raw
documents, encrypted draft contents, or hidden browser data.
