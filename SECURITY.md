# Security Policy

## Deployment Status

TrustLedger is currently **pre-mainnet**. No contracts hold real user funds yet.
The codebase targets Arbitrum Sepolia (testnet) and is under active development.

This policy will be updated when mainnet deployment occurs.

---

## Scope

### In scope

| Area                  | Examples                                                                            |
| --------------------- | ----------------------------------------------------------------------------------- |
| Smart contracts       | `TrustLedger.sol`, `Arbitration.sol`, `JurorRegistry.sol`, `ReputationRegistry.sol` |
| Interfaces            | All contracts under `contracts/src/interfaces/`                                     |
| Deployment scripts    | `contracts/script/Deploy.s.sol`, `scripts/deploy.ts`                                |
| Logic bugs            | Incorrect payout math, fee calculation errors, state machine violations             |
| Access control        | Functions callable by unauthorized addresses                                        |
| Reentrancy            | ETH or token transfers before state updates                                         |
| Signature issues      | Replay attacks, malformed ECDSA validation in `acceptContract()`                    |
| Arbitration integrity | Vote manipulation, juror slashing errors, appeal window bypass                      |

### Out of scope

- Vulnerabilities in third-party dependencies (OpenZeppelin, Hardhat, ethers.js) — report those to their maintainers directly
- Issues in `contracts/lib/` (forge-std, openzeppelin-contracts submodules)
- Findings on already-deployed testnet contracts with no real funds at risk
- Gas optimization suggestions (not security issues)
- Theoretical attacks with no realistic exploit path

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report privately by emailing: **<kevinle3212@gmail.com>**

Use the subject line: `[TrustLedger Security] <short description>`

### What to include

- A clear description of the vulnerability
- Which contract(s) and function(s) are affected
- A proof-of-concept — a Foundry test (`forge test`) or a step-by-step reproduction is ideal
- The impact: what an attacker could do and under what conditions
- Your suggested severity (see below)

The more detail you provide, the faster we can respond.

---

## Response Timeline

| Milestone          | Target                                          |
| ------------------ | ----------------------------------------------- |
| Acknowledgement    | Within 48 hours                                 |
| Initial assessment | Within 5 business days                          |
| Fix or mitigation  | Depends on severity (see below)                 |
| Public disclosure  | Coordinated with reporter after fix is deployed |

---

## Severity Classification

| Severity     | Description                                                                  | Example                                                           |
| ------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Critical** | Direct loss of funds or complete contract takeover                           | Reentrancy draining escrow, unauthorized `executeRuling()`        |
| **High**     | Significant disruption to core functionality or partial fund loss            | Fee pool manipulation, juror slashing bypass                      |
| **Medium**   | Incorrect behavior that degrades the system but does not directly lose funds | Wrong payout math, state machine shortcut                         |
| **Low**      | Minor issues with limited impact                                             | Off-by-one in a non-critical check, event emitted with wrong data |

---

## Bug Bounty

There is no formal bug bounty program at this time. For critical or high severity
findings reported before mainnet deployment, we will acknowledge contributors
publicly (with their permission) in the project's release notes.

---

## Out-of-Scope Conduct

The following are not permitted under any circumstances:

- Testing against contracts on mainnet or any network holding real user funds
- Social engineering attacks against contributors
- Denial-of-service testing against live infrastructure
