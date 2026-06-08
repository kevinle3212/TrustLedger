# FAQ

Common questions about using, building on, and contributing to TrustLedger. For
deeper detail, follow the links into [Architecture](ARCHITECTURE.md), the
[Contract Reference](CONTRACTS.md), and [Contributing](CONTRIBUTING.md).

---

## General

### What is TrustLedger?

A decentralized escrow and dispute-resolution protocol for freelance and
contract work, built on Ethereum. A client locks ETH or an ERC-20 token in
escrow, the freelancer delivers the work, and the client either approves payment
or opens a dispute that a staked juror panel resolves by commit-reveal vote.

### Is it live on mainnet?

No. TrustLedger is pre-mainnet and targets **Ethereum Sepolia** (testnet). No
contracts hold real user funds. See the security note at the bottom of any
reference page.

### Where is the live app?

The frontend is at
[trustledger-zeta.vercel.app](https://trustledger-zeta.vercel.app). The contract
addresses it reads come from `artifacts/deployed-addresses.json`, written on
each deploy.

### Do I Need an Account or Sign-Up?

No. TrustLedger is wallet-based — connect a wallet (e.g. MetaMask) on Sepolia.
Optional account/login is a planned mainnet feature, not part of the current
protocol.

---

## For clients

### How do I engage a client?

As a freelancer, call `proposeContract(...)` (or use the dashboard) to draft the
terms: the client address, the off-chain agreement's `keccak256` hash, an IPFS
URI, and the escrow amount. No funds move until the client accepts and funds the
escrow with `acceptContract(...)`. See the
[happy-path example](CONTRACTS.md#example-interactions).

### What happens if the client never funds the proposal?

While the contract is still `PENDING`, the freelancer can call
`cancelProposal(id)` to withdraw it (no funds are held), and the client may
`rejectContract(id)`. If the client funded the escrow but the freelancer then
misses the project deadline without submitting work, the client calls
`claimAfterDeadlineMiss(id)`.

### What if I'm not happy with the delivered work?

Within the acceptance window you can either `approveWork(id)` or
`disputeWork(id)`. Disputing forwards the arbitration fee pool to the juror
panel, which rules on a completion percentage (0-100) that determines the
proportional payout.

### What Is the Warranty Hold-Back?

An optional 5-15% (`holdBackBps`) of the payment withheld after approval until a
warranty period elapses, giving you recourse for issues found shortly after
delivery. Set `holdBackBps = 0` to disable it (then `warrantyPeriod` must also
be `0`).

---

## For freelancers

### How do I accept a contract?

Sign a message binding your wallet to the contract —
`eth_sign(keccak256(abi.encodePacked(id, yourAddress)))` — and submit it via
`acceptContract(id, v, r, s)`. The contract recovers the signer on-chain and
rejects any mismatch. See the
[signing example](CONTRACTS.md#example-interactions).

### How do I get paid?

Submit the deliverable with `submitProofOfWork(id, hash, uri)`, then the client
approves (`approveWork`), releasing `amount − holdBack`. If the client goes
silent past the 48-hour acceptance window, call `claimAfterAcceptanceWindow(id)`
to auto-release. Claim any warranty hold-back with `claimWarrantyFunds(id)`
after the warranty deadline.

### Can I reject a contract?

Yes — `rejectContract(id)` while it is `PENDING`. Funds are returned to the
client and the status becomes `CANCELLED`.

---

## Jurors

### How do I become a juror?

Stake at least `MIN_STAKE` (0.01 ETH) via `JurorRegistry.register()`.
Eligibility activates after a 7-day stake-lock period. See
[JurorRegistry](CONTRACTS.md#jurorregistrysol).

### How does voting work?

Commit-reveal. You first submit a hashed vote (`commitVote`), then reveal the
actual completion percentage and salt (`revealVote`) after the commit phase.
Hiding votes during commit prevents herding. The **median** revealed vote
becomes the ruling.

### Can I lose my stake?

Yes. Jurors whose vote lands in the minority — or who never reveal — are
**slashed**: 10% standard, or 20% if a vote deviates more than 30 percentage
points from the median (an outlier pattern typical of bribery/collusion).
Accurate (majority) jurors split the fee pool via `claimReward`.

### Why am I not eligible to vote?

`isEligible` requires all of: `active`, stake ≥ `MIN_STAKE`, the stake-lock
period elapsed, reputation ≥ `MIN_REPUTATION` (20), and the post-dispute 7-day
cooldown elapsed. Slashing lowers reputation by 10 each time.

---

## Disputes and appeals

### How is the payout decided?

The jurors' **median** completion percentage (0-100) drives a proportional split
of the escrow between freelancer and client, minus the arbitration fee pool. See
the payout formulas in [Architecture](ARCHITECTURE.md).

### Can a ruling be appealed?

Yes. Either party may `appeal` within the 72-hour appeal window by posting a
bond of 1.5× the fee pool. The appeal runs with a fresh, larger panel; the
original jurors and the two parties are excluded.

### What are the automatic reputation penalties?

On ruling execution: a completion ≥ 80 auto-rates the client `1` (the dispute
looks frivolous); a completion ≤ 20 auto-rates the freelancer `1` (work looks
deficient). Between those thresholds, neither side is auto-penalized and either
may still submit a normal rating.

---

## Fees, payments, and tokens

### What fees does TrustLedger charge?

The protocol itself doesn't take a cut. The only fee is the **arbitration fee
pool** (`arbitrationFeeBps`, max 50%), which is only spent if a dispute is
opened — it rewards the jurors who resolve it. Plus normal Ethereum gas.

### Can I use a stablecoin instead of ETH?

Yes — pass an ERC-20 `token` address and `tokenAmount` (with `msg.value = 0`)
and pre-approve the escrow contract. There's a local demo comparing gas vs ETH
escrow: `npm run demo:stablecoin`.

### How does reputation work?

After a contract reaches `APPROVED` or `RESOLVED`, each party may rate the other
once (1-100) via `submitRating`. Scores accumulate in `ReputationRegistry`,
which stores a cumulative `(sum, count)` per address; the average is
`numerator / denominator`.

### Why does the reputation page say reputation is not available?

The frontend found the deployed `TrustLedger`, but that contract returned the
zero address from `reputationRegistry()`. This happens when a TrustLedger
deployment was created before the separate `ReputationRegistry` contract was
deployed and wired in.

For a full redeploy, run the current Sepolia deploy workflow or
`npm run foundry:deploy:sepolia`; the current deploy script deploys
`ReputationRegistry` and calls `initReputationRegistry(...)` automatically.

To repair an existing Sepolia TrustLedger deployment without redeploying the
escrow contracts, run:

```bash
npm run hardhat:wire-reputation:sepolia
```

By default, the script reads the latest Sepolia `TrustLedger` address from
`contracts/broadcast/Deploy.s.sol/11155111/run-latest.json`. To wire a specific
deployment instead, set:

```bash
TRUSTLEDGER_ADDRESS=0xYourTrustLedger npm run hardhat:wire-reputation:sepolia
```

The script deploys `ReputationRegistry(TrustLedger)`, calls
`TrustLedger.initReputationRegistry(...)`, and writes
`artifacts/reputation-registry-wire.json` with the new registry address and
history start block. The operation is set-once: if `TrustLedger` is already
wired, the script prints the existing registry and exits.

After wiring, the production reputation page can discover the registry directly
from `TrustLedger.reputationRegistry()`. Updating Vercel's
`NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS` and
`NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK` is still recommended for faster history
loads, but the page no longer depends on those env vars to function.

---

## Developers and contributors

### How do I run it locally?

Either Docker (no local toolchain) or a local Hardhat chain plus the Next.js
frontend. Full setup, deploy, and demo-script instructions are in
[Contributing](CONTRIBUTING.md) and [Docker](DOCKER.md).

### How do I run the tests?

`npm run hardhat:test` for the Hardhat suite and `cd contracts && forge test`
for Foundry (unit, fuzz, and fork tests). See [Testing](TESTING.md).

### How do I deploy to a testnet?

Set `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, and `ETHERSCAN_API_KEY`, then use
the Hardhat or Foundry deploy scripts described in
[Contributing → Deploying to Ethereum Sepolia](CONTRIBUTING.md#deploying-to-ethereum-sepolia).
Get test ETH from a Sepolia faucet.

### Where do I report a security issue?

Privately — **do not** open a public GitHub issue. Follow the policy in
[SECURITY.md](../SECURITY.md).

---

## Documentation Site

### How do I edit these docs?

Edit the Markdown under `docs/` and register new pages in the `nav:` block of
`mkdocs.yml`. The site rebuilds automatically on push to `main`. See
[Contributing → Documentation Site](CONTRIBUTING.md#documentation-site).

### How do I preview the site locally?

```bash
pip install -r requirements-docs.txt
mkdocs serve   # http://127.0.0.1:8000
```

### A docs page 404s or won't show up — why?

Almost always a missing `.md` extension on a cross-doc link, or a page not
listed under `nav:`. See the troubleshooting table in
[Contributing → Documentation Site](CONTRIBUTING.md#troubleshooting).

---

## Related docs

- [Home](Home.md) - documentation index
- [Architecture](ARCHITECTURE.md) - system diagram, state machine, and payout
  formulas
- [Contract Reference](CONTRACTS.md) - full public API and example interactions
- [Contributing](CONTRIBUTING.md) - local setup, testing, and the documentation
  site

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
