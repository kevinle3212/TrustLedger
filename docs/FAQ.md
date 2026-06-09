# FAQ

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

This page answers common repository questions and links to canonical docs for
implementation details.

## Is TrustLedger Configured For Arbitrum Sepolia?

No source file currently configures Arbitrum Sepolia. Current config supports
local Hardhat, Ethereum Sepolia, Arbitrum One, Base, and Optimism. Read
[Deployment](DEPLOYMENT.md).

## Which Contract Reference Should I Use?

Use [Smart Contracts](SMART-CONTRACTS.md). The older `CONTRACTS.md` page is kept
only for compatibility.

## How Does A Freelancer Accept A Client Proposal?

The freelancer calls `acceptContractByFreelancer`. The client then funds with
`fundContractByClient`. This is separate from `acceptContract`, which is the
client funding step for freelancer-proposed escrows. Read
[Escrow Lifecycle](ESCROW-LIFECYCLE.md).

## How Do I Deploy?

Use [Deployment](DEPLOYMENT.md). The source-supported automated workflow deploys
to Ethereum Sepolia, not Arbitrum Sepolia.

## Which Environment Variables Are Required?

Read [Environment](ENVIRONMENT.md). Required variables depend on whether you are
deploying, running fork tests, using wallet connection, sending email, or
deploying to Vercel.

## Where Do I Get Sepolia ETH?

Use [Sepolia Faucets](FAUCETS.md). Faucet limits and verification rules change
often, so prefer the live faucet UI over stale third-party quota claims.

## Where Are The GitHub Models Scripts Documented?

Read [GitHub Models](GITHUB_MODELS.md) for workflow behavior and script-level
usage.
