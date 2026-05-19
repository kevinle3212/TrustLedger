# Security Policy

## Deployment Status

TrustLedger is currently **pre-mainnet**. No contracts hold real user funds yet.
The codebase targets Ethereum Sepolia (testnet) and is under active development.

This policy will be updated when mainnet deployment occurs.

---

## Mainnet Deployment Safety

> **This project was built and tested exclusively on Ethereum Sepolia (testnet).** If it is ever deployed to mainnet, the following checklist must be completed before any real funds are committed.

### Before deploying to mainnet

- [ ] **Independent audit** — Have the contracts audited by at least one reputable third-party security firm. Pay particular attention to `TrustLedger.sol` (escrow custody), `Arbitration.sol` (fee pool and ruling execution), and `JurorRegistry.sol` (stake slashing).
- [ ] **Token flow review** — Trace every ETH path end-to-end: deposit → escrow hold → payout / refund / fee split. Confirm no ETH can become permanently locked (check all `revert` paths, fallback handling, and re-entrancy guards).
- [ ] **Access control audit** — Verify that every privileged function (owner operations, `executeRuling`, juror selection) is callable only by the intended address and cannot be spoofed.
- [ ] **Testnet soak** — Run a full end-to-end lifecycle on Sepolia with realistic amounts and timing before touching mainnet. Simulate dispute creation, juror commit/reveal, ruling execution, and appeal.
- [ ] **Private key hygiene** — The `DEPLOYER_PRIVATE_KEY` used for deployment must never be reused and should be kept in a hardware wallet or secrets manager. Rotate all secrets before going live.
- [ ] **Upgrade path / immutability** — These contracts are not upgradeable. There is no admin escape hatch. Confirm this is intentional and document the disaster-recovery plan (e.g. migrate funds to a new deployment).
- [ ] **Oracle / timestamp risk** — The contracts rely on `block.timestamp` for deadlines. Verify that miner/validator timestamp manipulation cannot unlock funds or bypass phase transitions ahead of schedule.
- [ ] **Formal verification (recommended)** — Run Foundry's fuzz suite with increased run counts and consider a formal verification pass on critical invariants (escrow balance ≥ sum of all held amounts, fee pool monotonicity).

Skipping any item above before a mainnet deployment puts real user funds at risk.

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

---

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for full terms.

---

## Authors

- Kevin Le
- Kellen Snider
