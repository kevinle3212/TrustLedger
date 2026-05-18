# Miscellaneous

Supplementary notes that don't belong in any single other document.

---

## Glossary

| Term                  | Definition                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Escrow**            | ETH or ERC-20 tokens locked inside `TrustLedger.sol` until a contract resolves (approved, rejected, cancelled, or ruled on by arbitration).          |
| **Hold-back**         | A percentage of the escrow withheld from the freelancer's payout at approval and released later after a warranty period passes without a claim.      |
| **Warranty period**   | A time window after approval during which the hold-back is locked. The freelancer can claim it once the window elapses with no dispute.              |
| **Buffer factor**     | A multiplier (expressed as integer per-1000) applied to `estimatedDuration` to compute the project deadline — e.g., 1200 = 1.2× buffer.              |
| **Acceptance window** | How long the freelancer has to sign and call `acceptContract()` before the client can treat the contract as void and reclaim funds.                  |
| **Commit-reveal**     | A two-phase voting scheme where jurors first submit `keccak256(vote, salt)` (commit), then later reveal `(vote, salt)` to prevent front-running.     |
| **Completion pct**    | The integer 0-100 returned by arbitration after dispute resolution. Determines the split: `freelancerPayout = amount × completionPct / 100`.         |
| **Juror eligibility** | A juror is eligible if: registered, stake ≥ `MIN_STAKE` (0.01 ETH), stake lock period (7 days) has fully elapsed, and no active disputes block them. |
| **Stake lock**        | After registering or adding stake, a juror must wait 7 days before being eligible for disputes. Prevents sybil attacks via flash-staking.            |
| **Slashing**          | `Arbitration` reduces a minority juror's stake and their `minorityVotes` counter; if stake falls below `MIN_STAKE`, the juror is deactivated.        |
| **Appeal bond**       | The ETH deposit required to appeal a ruling. Set at 1.5× the original arbitration fee pool. Half is refunded if the appeal changes the ruling.       |
| **Median ruling**     | After all reveals, `Arbitration` computes the median of juror `completionPct` values as the final ruling, making it resistant to outlier votes.      |
| **IPFS hash**         | The `proofOfWorkHash` submitted by the freelancer — a `bytes32` CID identifying the deliverable stored off-chain on IPFS.                            |
| **VRF**               | Chainlink Verifiable Random Function — used to randomly pre-select a subset of eligible jurors for a dispute, preventing juror self-selection bias.  |
| **Price feed**        | Chainlink `AggregatorV3Interface` queried at contract creation to record the ETH/USD value of the escrow at that moment (informational only).        |

---

## Tooling Overview

| Tool                  | Role                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Hardhat 2.x**       | Local EVM node, TypeScript deployment scripts, integration test runner (Mocha/Chai/ethers.js)                                   |
| **Foundry (forge)**   | Solidity-native unit tests, fuzz tests, gas reports, `forge fmt` / `forge build`, and `forge script` for testnet deployment     |
| **TypeChain**         | Generates TypeScript types from Hardhat-compiled ABIs so test code is fully type-safe                                           |
| **Husky**             | Runs `npm run lint` before every commit and `commitlint` against the commit message via git hooks                               |
| **commitlint**        | Enforces Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, etc.) on every commit message                                |
| **ESLint**            | TypeScript linting; flat-config mode (`eslint.config.mjs`)                                                                      |
| **Prettier**          | Consistent formatting for TypeScript, JSON, Markdown, and YAML files                                                            |
| **Solhint**           | Solidity-specific style and security linting rules                                                                              |
| **markdownlint-cli2** | Lints all documentation Markdown files against the rules in `.markdownlint.json`                                                |
| **nexus-graph**       | Indexes TypeScript/JavaScript source as a symbol graph; serves token-budgeted code context to Claude Code via MCP (`.mcp.json`) |

### Why both Hardhat and Foundry?

Hardhat is used for integration tests: ethers.js + TypeChain make it easy to simulate multi-wallet interactions, balance diffs, and event assertions in TypeScript. Foundry is used for unit and fuzz tests: Solidity-native cheatcodes (`vm.prank`, `vm.warp`, `vm.expectRevert`) are faster for lower-level invariant checks. Both toolchains share `solc 0.8.24` and `optimizer_runs = 200`.

---

## Optional Chainlink Integrations

Both integrations are optional. The contracts work without them — `initPriceFeed` and `initVrfCoordinator` are one-time setup calls that can be skipped entirely in local dev and tests.

### Price Feed (ETH/USD)

Wired via `TrustLedger.initPriceFeed(address feed)`. After calling it, every new ETH escrow records the USD value of the deposit at creation time in `usdValueAtCreation`. This is informational only — it does not affect payouts.

```bash
# Ethereum Sepolia ETH/USD feed address
cast send <TRUST_LEDGER_ADDRESS> "initPriceFeed(address)" \
  0x694AA1769357215DE4FAC081bf1f309aDC325306 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### VRF Juror Pre-Selection

Wired via `JurorRegistry.initVrfCoordinator(address coordinator, bytes32 keyHash, uint64 subscriptionId)`. After calling it, opening a dispute requests randomness from Chainlink VRF. The callback (`fulfillRandomWords`) pre-selects a random subset of eligible jurors. Only pre-selected jurors can commit votes.

On a local Hardhat node or in tests, a `MockVRFCoordinator` is deployed and wired so that `fulfillRandomWords` can be called manually to simulate the VRF response.

---

## Design Decisions

**No admin or owner role.** There is no `owner`, `admin`, or `paused` flag in any contract. Every state transition is fully on-chain and permissionless from the participants' perspective. This is intentional — centralized admin keys are a common attack surface and undermine the trustless guarantee.

**No upgradeability.** The contracts are not proxies. A bug requires deploying a new set of contracts and migrating. This is a deliberate trade-off: upgrade mechanisms add complexity and are often the root cause of exploits (storage collisions, initialization issues).

**Custom errors over `require` strings.** All reverts use named custom errors (e.g., `ZeroAddress()`, `NotClient()`, `WrongStatus()`). This reduces gas costs and makes revert reasons machine-readable without ABI decoding strings.

**Checks-Effects-Interactions.** All storage writes happen before any external calls (token transfers, ETH sends). This prevents re-entrancy without relying solely on the `ReentrancyGuard` modifier.

**`solc 0.8.24`, `optimizer_runs = 200`.** The optimizer run count of 200 balances deployment cost against call cost for a contract expected to be called thousands of times across its life.

---

## VSCode Workspace Notes

`.vscode/settings.json` configures:

- **Solidity tab size** — 4 spaces, no auto-detection, consistent with `forge fmt` defaults.
- **markdownlint** — MD010 (hard tabs) and MD041 (first-line heading) disabled to match `.markdownlint.json` and allow tabs in code blocks.
- **GitHub Actions** — workflow pinned-refresh disabled to avoid noisy background fetches.
- **Todo Tree** — submodule directories (`contracts/lib/**`) excluded so third-party TODOs don't pollute the tree.
- **ESLint flat config** — `eslint.useFlatConfig: true` tells the ESLint VS Code extension to use the new flat config format (`eslint.config.mjs`).

---

## Security

See [SECURITY.md](../SECURITY.md) for the full vulnerability reporting policy, in-scope contracts, severity classification, and response timeline.

**Do not open public GitHub issues for security vulnerabilities.** Report privately via the contact in `SECURITY.md`.

TrustLedger is currently pre-mainnet. No contracts hold real user funds. The codebase targets Ethereum Sepolia (testnet) and is under active development.

---

## License

This project is licensed under the Apache License 2.0. See [LICENSE](../LICENSE) for full terms.

---

## Authors

- Kevin Le
- Kellen Snider
