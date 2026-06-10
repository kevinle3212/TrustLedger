# Analytics Visualization Scripts

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

These scripts support Phase 6 analytics and visualization work. They generate
privacy-safe charts from aggregate, public, or synthetic wallet metrics for
docs, whitepaper drafts, and frontend design references.

The default generator uses NumPy, Pandas, SymPy, SciPy, Seaborn, Matplotlib,
Plotly, and Bokeh. Matplotlib cache files are written to project-local
`tmp/matplotlib/` so the script does not use the user's home directory.

Generated artifacts:

- `assets/analytics/wallet-analytics-preview.svg`
- `assets/analytics/wallet-analytics-report.json`
- `assets/analytics/wallet-analytics-plotly.json`
- `assets/analytics/wallet-analytics-bokeh.json`

## Commands

```sh
npm run analytics:generate
npm run analytics:check
```

Generated visuals must not include private keys, seed phrases, emails, raw
documents, encrypted draft contents, or hidden browser data.
