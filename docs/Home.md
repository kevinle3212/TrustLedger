# TrustLedger Wiki

A decentralized escrow and dispute resolution protocol for freelance agreements,
deployed on Ethereum. Clients lock ETH or ERC-20 tokens, freelancers complete
work, and disputes are resolved by a staked juror panel using commit-reveal
voting.

**Live app:** [trustledger-zeta.vercel.app](https://trustledger-zeta.vercel.app)

---

## Documentation

| Page                               | Description                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| [Architecture](ARCHITECTURE.md)    | System diagram, contract interaction flow, state machine, and payout formulas   |
| [Contract Reference](CONTRACTS.md) | Full public API - functions, events, errors, and storage for all five contracts |
| [Contributing](CONTRIBUTING.md)    | Local setup, compiling, testing, linting, and deploying to testnet              |
| [FAQ](FAQ.md)                      | Common questions for clients, freelancers, jurors, and contributors             |
| [Deployment](DEPLOYMENT.md)        | Vercel deployment, environment variables, CI/CD pipeline                        |
| [Docker](DOCKER.md)                | Docker setup, services, MetaMask configuration, and troubleshooting             |
| [Testing](TESTING.md)              | Hardhat and Foundry test suites, fork tests, fuzz tests, and CI                 |
| [Miscellaneous](MISCELLANEOUS.md)  | Glossary, design decisions, Chainlink setup, tooling rationale                  |
| [Presentation](PRESENTATION.md)    | Slide-by-slide notes for pitches and demos                                      |
| [GitHub Models](GITHUB_MODELS.md)  | `.prompt.yml` examples, Python SDK, and Actions workflow for Models testing     |

---

## How It Works

1. **Client creates a contract** - locks ETH into escrow, specifies the
   freelancer wallet and off-chain agreement (IPFS hash stored on-chain).
2. **Freelancer accepts** - signs via ECDSA wallet binding; the contract
   recovers the signer on-chain and rejects any mismatch.
3. **Freelancer submits work** - posts an IPFS hash of the deliverable on-chain
   as immutable proof.
4. **Client approves or disputes** - approval releases funds; a dispute opens a
   commit-reveal juror vote.
5. **Jurors vote** - staked jurors submit a hidden completion percentage
   (0-100), then reveal. The median becomes the ruling.
6. **Proportional payout** - the freelancer receives their share based on the
   ruling; minority jurors are slashed.

---

## Key Features

- **Immutable proof of agreement and deliverable** - keccak256 hashes stored
  on-chain, tampering is immediately detectable
- **ECDSA wallet binding** - freelancers accept contracts with their private key
  via EIP-191 signatures
- **Commit-reveal voting** - votes are hidden during the commit phase to prevent
  herding
- **Chainlink VRF juror selection** - verifiable randomness selects jurors at
  dispute time
- **Partial completion rulings** - median vote (0-100) produces a proportional
  payout, not a binary verdict
- **Juror slashing** - minority voters lose 10% stake; accurate voters earn
  fee-pool rewards
- **Appeals** - either party can appeal within 72 hours with a 1.5× bond and a
  fresh independent panel
- **Warranty hold-back** - a configurable portion of payment is withheld until a
  warranty period elapses
- **Bidirectional reputation** - clients and freelancers rate each other after
  completion; scores accumulate in `ReputationRegistry`
- **ERC-20 escrow** - stablecoin escrows avoid locking ETH; local demo compares
  gas vs ETH escrow (`npm run demo:stablecoin`)

---

## Contracts

| Contract                 | Role                                                             |
| ------------------------ | ---------------------------------------------------------------- |
| `TrustLedger.sol`        | Core escrow engine - manages contract lifecycle and payouts      |
| `Arbitration.sol`        | Dispute engine - commit-reveal voting, appeals, juror rewards    |
| `JurorRegistry.sol`      | Juror staking, eligibility, locking, and slashing                |
| `ReputationRegistry.sol` | On-chain reputation scores updated after each completed contract |

All contracts are deployed on Ethereum Sepolia. Addresses are written to
`artifacts/deployed-addresses.json` after each deploy and injected into the
frontend automatically via CI.

---

> This wiki is synced automatically from the
> [`docs/`](https://github.com/kevinle3212/TrustLedger/tree/main/docs) directory
> on every push to `main`.
