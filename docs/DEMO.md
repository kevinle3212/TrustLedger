# Demo Guide

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

This document explains the local demo scripts included with TrustLedger. Read it
when preparing a contract lifecycle or arbitration demonstration.

## Prerequisites

Start a local Hardhat chain:

```bash
npm run node
```

Deploy contracts to the local chain:

```bash
npm run hardhat:deploy:local
```

## Demo Scripts

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
