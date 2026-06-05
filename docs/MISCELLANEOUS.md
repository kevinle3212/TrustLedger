# Miscellaneous

Supplementary notes that don't belong in any single other document.

---

## Glossary

| Term                      | Definition                                                                                                                                                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Escrow**                | ETH or ERC-20 tokens locked inside `TrustLedger.sol` until a contract resolves (approved, rejected, cancelled, or ruled on by arbitration).                                                                                                                                                                               |
| **Hold-back**             | A percentage of the escrow withheld from the freelancer's payout at approval and released later after a warranty period passes without a claim.                                                                                                                                                                           |
| **Warranty period**       | A time window after approval during which the hold-back is locked. The freelancer can claim it once the window elapses with no dispute.                                                                                                                                                                                   |
| **Buffer factor**         | A multiplier (expressed as integer per-1000) applied to `estimatedDuration` to compute the project deadline - e.g., 1200 = 1.2× buffer.                                                                                                                                                                                   |
| **Acceptance window**     | How long the freelancer has to sign and call `acceptContract()` before the client can treat the contract as void and reclaim funds.                                                                                                                                                                                       |
| **Commit-reveal**         | A two-phase voting scheme where jurors first submit `keccak256(vote, salt)` (commit), then later reveal `(vote, salt)` to prevent front-running.                                                                                                                                                                          |
| **Completion pct**        | The integer 0-100 returned by arbitration after dispute resolution. Determines the split: `freelancerPayout = amount × completionPct / 100`.                                                                                                                                                                              |
| **Juror eligibility**     | A juror is eligible if: (1) registered and active, (2) stake ≥ `MIN_STAKE` (0.01 ETH), (3) stake lock period (7 days) has fully elapsed, (4) reputation score ≥ `MIN_REPUTATION` (20), and (5) post-dispute cooldown (7 days after `unlockFromDispute`) has expired.                                                      |
| **Stake lock**            | After registering or adding stake, a juror must wait 7 days before being eligible for disputes. Prevents sybil attacks via flash-staking.                                                                                                                                                                                 |
| **Slashing**              | `Arbitration` reduces a minority juror's stake using tiered rates: votes that deviate > `SEVERE_MINORITY_THRESHOLD` (30 pct points) from the median are slashed at `SEVERE_SLASH_BPS` (20%); smaller deviations are slashed at the standard `SLASH_BPS` rate. If stake falls below `MIN_STAKE`, the juror is deactivated. |
| **Post-dispute cooldown** | After a dispute resolves, `JurorRegistry.unlockFromDispute()` sets a 7-day cooldown on the juror (`JUROR_COOLDOWN`). The juror is ineligible for new disputes until the cooldown expires, limiting the window for coordinated bribery across back-to-back disputes.                                                       |
| **Appeal bond**           | The ETH deposit required to appeal a ruling. Set at 1.5× the original arbitration fee pool. Half is refunded if the appeal changes the ruling.                                                                                                                                                                            |
| **Median ruling**         | After all reveals, `Arbitration` computes the median of juror `completionPct` values as the final ruling, making it resistant to outlier votes.                                                                                                                                                                           |
| **IPFS hash**             | A `bytes32` `keccak256` digest of a file's raw bytes, stored on-chain alongside its IPFS URI. Required (non-zero) for both `contractHash` and `proofOfWorkHash`; computed client-side before upload so the on-chain record covers file content, not just the pointer.                                                     |
| **VRF**                   | Chainlink Verifiable Random Function - optional oracle used to randomly pre-select a subset of eligible jurors for a dispute. When configured, provides a cryptographic proof of randomness. When not configured, the contract falls back to RANDAO.                                                                      |
| **RANDAO**                | EIP-4399 beacon-chain entropy (`block.prevrandao`) used as the default juror-selection seed when Chainlink VRF is not configured. Combined with `block.timestamp` and the `disputeId` and hashed with `keccak256` to produce a unique seed per dispute.                                                                   |
| **Price feed**            | Chainlink `AggregatorV3Interface` queried at contract creation to record the ETH/USD value of the escrow at that moment (informational only).                                                                                                                                                                             |
| **contractHash**          | `keccak256` of the contract document bytes (not the URI string). Stored on-chain so any modification to the document is immediately detectable.                                                                                                                                                                           |
| **AES-256-GCM**           | Symmetric encryption scheme used to encrypt sensitive contract documents client-side before IPFS upload. Key is derived via PBKDF2-SHA256.                                                                                                                                                                                |
| **Pinata**                | IPFS pinning service used to upload and persistently host contract and proof-of-work documents. Requires a JWT (`NEXT_PUBLIC_PINATA_JWT`).                                                                                                                                                                                |
| **Arweave**               | Permanent, pay-once storage network used as a fallback for documents requiring long-term legal retention. Accessed via a user-provided JWK wallet.                                                                                                                                                                        |
| **Pauser**                | Optional address on `TrustLedger` that can call `pause()` / `unpause()` to block new escrow creation. Set once via `initPauser()`; fund exits unaffected.                                                                                                                                                                 |

---

## Tooling Overview

| Tool                  | Role                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hardhat 2.x**       | Local EVM node, TypeScript deployment scripts, integration test runner (Mocha/Chai/ethers.js)                                                                          |
| **Foundry (forge)**   | Solidity-native unit tests, fuzz tests, gas reports, `forge fmt` / `forge build`, and `forge script` for testnet deployment                                            |
| **TypeChain**         | Generates TypeScript types from Hardhat-compiled ABIs so test code is fully type-safe                                                                                  |
| **Husky**             | Runs `npm run lint` before every commit and `commitlint` against the commit message via git hooks                                                                      |
| **commitlint**        | Enforces Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, etc.) on every commit message                                                                       |
| **ESLint**            | TypeScript linting; flat-config mode (`eslint.config.mjs`)                                                                                                             |
| **Prettier**          | Consistent formatting for TypeScript, JSON, Markdown, and YAML files                                                                                                   |
| **Solhint**           | Solidity-specific style and security linting rules                                                                                                                     |
| **markdownlint-cli2** | Lints all documentation Markdown files against the rules in `.markdownlint.json`                                                                                       |
| **nexus-graph**       | Indexes TypeScript/JavaScript source as a symbol graph; serves token-budgeted code context to Claude Code via MCP (`.mcp.json`)                                        |
| **rtk**               | Token-optimized Claude Code CLI proxy (60-90% token savings on shell operations); transparently wraps commands via a session hook - run `rtk gain` to view savings     |
| **Excalidraw**        | Hand-drawn-style diagramming tool used for architecture sketches and flow diagrams; export as SVG/PNG for embedding in docs ([excalidraw.com](https://excalidraw.com)) |
| **Vercel**            | Frontend hosting platform; auto-deploys on push to `main` and exposes preview URLs on every PR - configured in `src/vercel.json` and `.vercel/project.json`            |
| **RainbowKit**        | Wallet connection UI library for React - provides the connect-wallet modal, multi-wallet support, and chain-switching UI; wired via wagmi in `src/lib/wagmi.ts`        |

### RTK — Token Proxy for Claude Code

[RTK](https://www.rtk-ai.app/) is a CLI proxy that wraps shell commands run by
Claude Code and strips output noise before it reaches the LLM context window.
This reduces token usage on shell-heavy workflows (git, npm, forge) by 60-90%.

**Install:**

```bash
brew install rtk
```

**Verify:**

```bash
rtk --version        # rtk X.Y.Z
rtk gain             # cumulative token savings this session
rtk gain --history   # per-command savings breakdown
```

**How it integrates:** Claude Code's session hook (in `.claude/settings.json`)
transparently rewrites commands through RTK. Install it once and every
subsequent Claude Code session uses it automatically — no per-project
configuration required.

**Useful meta-commands** (always call these directly, not through the hook):

| Command              | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `rtk gain`           | Show cumulative token savings for the current session |
| `rtk gain --history` | Show per-command savings history                      |
| `rtk discover`       | Scan Claude Code history for missed RTK opportunities |
| `rtk proxy <cmd>`    | Run a command through RTK manually (for debugging)    |

> ⚠️ **Name collision:** `reachingforthejack/rtk` (Rust Type Kit) is an
> unrelated Homebrew package. Run `rtk gain` to confirm you have the correct
> binary — Rust Type Kit does not have this subcommand.

---

### Why Both Hardhat and Foundry?

Hardhat is used for integration tests: ethers.js + TypeChain make it easy to
simulate multi-wallet interactions, balance diffs, and event assertions in
TypeScript. Foundry is used for unit and fuzz tests: Solidity-native cheatcodes
(`vm.prank`, `vm.warp`, `vm.expectRevert`) are faster for lower-level invariant
checks. Both toolchains share `solc 0.8.24` and `optimizer_runs = 200`.

---

## Known Dependency Issues

### `ws` - WebSocket DoS (CVE-2024-37890)

- **Affected:** All versions of `ws` before 8.17.1 allow a remote attacker to
  cause a DoS by sending a specially crafted HTTP request.
- **Fix:** Both `package.json` and `src/package.json` pin `ws` to `8.20.1` via
  npm `overrides`. This forces every transitive dependent (Reown AppKit, wagmi,
  Hardhat) to resolve to the patched version.
- **Status:** Suppressed. `npm audit` exits clean.

### `postcss` - Line-Return Parsing Issue (CVE-2023-44270)

- **Affected:** `postcss` < 8.4.31 incorrectly parses `\r` line endings, which
  could allow CSS injection in certain linter configurations.
- **Fix:** `src/package.json` pins `postcss` to `8.5.10` via `overrides`. The
  root package does not use PostCSS directly.
- **Status:** Suppressed. Frontend `npm audit` exits clean.

### TypeScript 6 + Hardhat 2.x Incompatibility

- **Issue:** TypeScript 6 renamed several internal APIs that `ts-node` (used by
  Hardhat) depends on. Running `npx hardhat` with the default tsconfig causes a
  `TS6305` or `ignoreDeprecations` error.
- **Fix:** A separate `tsconfig.hardhat.json` is maintained with
  `"ignoreDeprecations": "6.0"` and `"module": "CommonJS"`. All
  `npm run hardhat:*` scripts set `TS_NODE_PROJECT=tsconfig.hardhat.json`.
- **Status:** Working. Do not remove `tsconfig.hardhat.json` or merge it into
  the main tsconfig.

### Node.js 25 + Hardhat 2.x ESM Guard

- **Issue:** Node.js 25 enforces stricter ESM/CJS boundary checks. With
  `"type": "module"` set in `package.json`, Mocha fails to load `.ts` test files
  via `ts-node`.
- **Fix:** `"type": "module"` is intentionally absent from `package.json`.
  `tsconfig.hardhat.json` additionally sets
  `"ts-node": { "moduleTypes": { "*.ts": "cjs" } }` to force CJS loading.
- **Status:** Working. Do not add `"type": "module"` to the root `package.json`.

---

## Optional Storage Integrations

### IPFS via Pinata

The create-contract page can upload files directly to IPFS using Pinata's
pinning API. Set `NEXT_PUBLIC_PINATA_JWT` (a scoped API JWT from
[pinata.cloud](https://pinata.cloud)) in the root `.env`. If the env var is not
set, a JWT input field is shown in the UI at runtime.

After upload the IPFS URI is auto-filled into the form, and `contractHash` is
computed from the uploaded bytes - not the URI string - so on-chain tamper
detection covers actual file content. Both the hash and the URI are **required
by the contract**: `createContract` reverts with `EmptyHash` if
`contractHash == bytes32(0)` and `EmptyURI` if `contractURI` is empty. The same
enforcement applies to `submitProofOfWork` - `powHash` and `powURI` must both be
provided. The UI computes the hash client-side before the Pinata upload so the
hash always reflects the actual file bytes.

### Client-Side Encryption (AES-256-GCM)

Sensitive contract documents can be encrypted before upload. The frontend
derives a 256-bit AES key from a user-supplied passphrase via PBKDF2-SHA256
(100,000 iterations), encrypts with AES-GCM, and bundles the ciphertext with the
KDF parameters in a self-describing JSON blob. The passphrase must be shared
with the counterparty out-of-band (e.g. via a secure messaging channel). No
encryption keys are ever transmitted to any server.

### Arweave Permanent Backup

After IPFS upload, users can optionally back up documents to Arweave for
permanent retention. The user loads their Arweave JWK wallet file - the private
key never leaves the browser. The frontend signs and broadcasts the transaction
using the `arweave` JS library. The `ar://` URI is displayed after a successful
upload and can be noted alongside the IPFS URI.

---

### Magic Link (Freelancer Email Onboarding)

When a client creates a contract and provides the freelancer's email address,
the frontend automatically sends a signed magic link after the transaction
confirms. The link lets the freelancer review the contract and accept it through
a browser without needing prior wallet setup.

**Flow:**

1. Client fills in `Freelancer Email` on the create-contract page.
2. After `createContract` confirms on-chain, the frontend parses the
   `ContractCreated` event log to extract the contract ID, then calls
   `POST /api/magic-link/send`.
3. The API generates an HMAC-SHA256 token (payload: `contractId`,
   `freelancerEmail`, `freelancerAddress`, `nonce`, 72-hour expiry) and sends an
   HTML email via Resend.
4. Freelancer opens `/freelancer/accept?token=…` in their browser.
5. The page calls `GET /api/magic-link/verify` to validate the HMAC signature
   and expiry server-side.
6. The page reads the contract from chain via `getContract`, shows the terms,
   and prompts wallet connection.
7. The connected wallet must match `freelancerAddress` encoded in the token -
   mismatches are blocked.
8. The freelancer signs
   `keccak256(abi.encodePacked(contractId, freelancerAddress))` via
   `signMessage` (EIP-191 personal sign).
9. The page extracts `v, r, s` from the signature and calls
   `acceptContract(id, v, r, s)` on-chain.
10. The contract transitions `PENDING → ACTIVE`; the project deadline timer
    starts.

**Single-use guarantee:** The token carries no server-side revocation state.
Idempotency comes entirely from the contract's irreversible status machine - a
replayed link will find the contract in `ACTIVE` (or later) state and
`acceptContract` will revert with `InvalidStatus`.

**Required env vars:**

| Variable              | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `MAGIC_LINK_SECRET`   | Random secret for HMAC signing. Generate: `openssl rand -hex 32` |
| `RESEND_API_KEY`      | API key from [resend.com/api-keys](https://resend.com/api-keys)  |
| `RESEND_FROM`         | Verified sender address (or `onboarding@resend.dev` for dev)     |
| `NEXT_PUBLIC_APP_URL` | Base URL for the magic link (e.g. `http://localhost:3000`)       |

**Known issues:**

- **`onboarding@resend.dev` recipient restriction** - When `RESEND_FROM` is set
  to `onboarding@resend.dev` (Resend's shared test address), Resend only
  delivers to the single email address registered on the Resend account. Sending
  to any other address returns a 502. This affects staging/preview environments
  and local dev that share the same test API key. Fix: verify a custom domain at
  [resend.com/domains](https://resend.com/domains) and set `RESEND_FROM` to an
  address on that domain, then Resend will deliver to any recipient.

---

## Optional Chainlink Integrations

Both integrations are optional. The contracts work without them -
`initPriceFeed` and `initVrfCoordinator` are one-time setup calls that can be
skipped entirely in local dev and tests.

### Price Feed (ETH/USD)

Wired via `TrustLedger.initPriceFeed(address feed)`. After calling it, every new
ETH escrow records the USD value of the deposit at creation time in
`usdValueAtCreation`. This is informational only - it does not affect payouts.

```bash
# Ethereum Sepolia ETH/USD feed address
cast send <TRUST_LEDGER_ADDRESS> "initPriceFeed(address)" \
  0x694AA1769357215DE4FAC081bf1f309aDC325306 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### Juror Selection: Chainlink VRF and RANDAO

By default, juror selection uses **RANDAO** (`block.prevrandao`), the EIP-4399
beacon-chain entropy value available in every block. When a dispute is opened,
the contract derives a seed from
`keccak256(block.prevrandao, block.timestamp, disputeId)` and immediately runs a
partial Fisher-Yates shuffle over the staked juror pool to pre-select the
committee. No external call or gas overhead beyond the dispute transaction
itself is required.

For production deployments that need stronger randomness guarantees, wire in
**Chainlink VRF** via `Arbitration.initVrfCoordinator(address vrf_)`. After that
call, new disputes request one random word from the VRF coordinator; the
callback (`fulfillRandomWords`) delivers it and runs the same Fisher-Yates
shuffle. Only pre-selected jurors can commit votes. The `keyHash` and
subscription ID are embedded as literals in the contract (`bytes32(0)` and `0`
respectively) and should be updated before mainnet deployment.

On a local Hardhat node or in tests, a `MockVRFCoordinator` is deployed and
wired so that `fulfillRandomWords` can be called manually to simulate the VRF
callback without waiting for an off-chain oracle.

---

## Design Decisions

**L2 production deployments.** The contracts are chain-agnostic EVM bytecode.
Sepolia is used for development and testing only. Production targets Arbitrum
One (chainId 42161), Base (8453), or Optimism (10) - all three are configured in
`hardhat.config.ts` and `foundry.toml`. The appropriate L2 is selected based on
where the freelance market has the most liquidity and lowest gas costs at launch
time. Foundry deploy scripts accept `--rpc-url` as a parameter, so switching
chains requires only changing the network flag.

**Contract amendment via invalidation and replacement.** When a client needs to
renegotiate terms before the freelancer has accepted, the amendment flow is:
`cancelPending(oldId)` → `createContract(...)` → `linkAmendment(newId, oldId)`.
This produces a permanent on-chain version chain: each contract stores
`previousContractId` pointing to its cancelled predecessor (`type(uint256).max`
= original). The amendment history is fully reconstructable from events
(`ContractCancelled` + `ContractAmended`) without any trusted intermediary.
Amendments are only possible while the contract is `PENDING` - once a freelancer
accepts (`ACTIVE`), renegotiation requires mutual off-chain agreement and a new
contract from scratch.

**Minimal privileged role - pauser only.** There is no `owner` or `admin` role
in any contract. The only privilege is the optional `pauser` address on
`TrustLedger`, set once via `initPauser()`. It can pause `createContract` to
block new deposits during an incident, but cannot touch funds already in
escrow - all lifecycle exits remain open. If `initPauser` is never called, pause
is permanently unavailable. Every other state transition is fully on-chain and
permissionless from the participants' perspective.

**No upgradeability.** The contracts are not proxies. A bug requires deploying a
new set of contracts and migrating. This is a deliberate trade-off: upgrade
mechanisms add complexity and are often the root cause of exploits (storage
collisions, initialization issues).

**Custom errors over `require` strings.** All reverts use named custom errors
(e.g., `ZeroAddress()`, `NotClient()`, `WrongStatus()`). This reduces gas costs
and makes revert reasons machine-readable without ABI decoding strings.

**Checks-Effects-Interactions.** All storage writes happen before any external
calls (token transfers, ETH sends). This prevents re-entrancy without relying
solely on the `ReentrancyGuard` modifier.

**`solc 0.8.24`, `optimizer_runs = 200`.** The optimizer run count of 200
balances deployment cost against call cost for a contract expected to be called
thousands of times across its life.

---

## VSCode Workspace Notes

`.vscode/settings.json` configures:

- **Solidity tab size** - 4 spaces, no auto-detection, consistent with
  `forge fmt` defaults.
- **markdownlint** - MD010 (hard tabs) and MD041 (first-line heading) disabled
  to match `.markdownlint.json` and allow tabs in code blocks.
- **GitHub Actions** - workflow pinned-refresh disabled to avoid noisy
  background fetches.
- **Todo Tree** - submodule directories (`contracts/lib/**`) excluded so
  third-party TODOs don't pollute the tree.
- **ESLint flat config** - `eslint.useFlatConfig: true` tells the ESLint VS Code
  extension to use the new flat config format (`eslint.config.mjs`).

---

## Related Docs

- [Home](Home.md) - documentation index
- [GitHub Models](GITHUB_MODELS.md) - `.prompt.yml` examples, Python SDK, and
  Actions workflow
- [Contributing](CONTRIBUTING.md) - local setup, testing, and demo scripts
- [Architecture](ARCHITECTURE.md) - system diagram and design decisions

---

## Security

See [SECURITY.md](../SECURITY.md) for the full vulnerability reporting policy,
in-scope contracts, severity classification, and response timeline.

**Do not open public GitHub issues for security vulnerabilities.** Report
privately via the contact in `SECURITY.md`.

TrustLedger is currently pre-mainnet. No contracts hold real user funds. The
codebase targets Ethereum Sepolia (testnet) and is under active development.

---

## License

This project is licensed under the Apache License 2.0. See [LICENSE](../LICENSE)
for full terms.

---

## Authors

- [Kevin Le](https://www.linkedin.com/in/lekevin1/)
- [Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)
