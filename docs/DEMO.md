# Demo Guide

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Prerequisites](#prerequisites)
- [Demo Scripts](#demo-scripts)

<!-- docs-toc:end -->

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../CREDITS.md).

This document explains the local demo scripts included with TrustLedger. Read it
when preparing a contract lifecycle or arbitration demonstration.

## Prerequisites

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Start a local Hardhat chain:

```bash
npm run node
```

Deploy contracts to the local chain:

```bash
npm run hardhat:deploy:local
```

## Demo Scripts

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Run demo scripts from the repository root after the local deployment.

| Scenario             | Command                   |
| -------------------- | ------------------------- |
| Successful lifecycle | `npm run demo:good`       |
| Failed work scenario | `npm run demo:bad`        |
| Juror scenario       | `npm run demo:jurors`     |
| Scenario runner      | `npm run demo:scenario`   |
| Stablecoin scenario  | `npm run demo:stablecoin` |
| Shell wrapper        | `npm run demo:run`        |

The demo scripts use the local Hardhat network and deployed-address artifacts.
They are not a replacement for the Foundry and Hardhat test suites documented in
[Testing](TESTING.md).
