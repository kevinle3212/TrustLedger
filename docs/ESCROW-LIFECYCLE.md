# Escrow Lifecycle

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Statuses](#statuses)
- [Freelancer-Proposed Flow](#freelancer-proposed-flow)
    - [Proposal](#proposal)
    - [Funding](#funding)
    - [Cancellation](#cancellation)
- [Client-Proposed Flow](#client-proposed-flow)
- [Work Submission](#work-submission)
- [Approval And Holdback](#approval-and-holdback)
- [Deadline Claims](#deadline-claims)
- [Disputes](#disputes)
- [Ratings](#ratings)
- [Authors and Contributors](#authors-and-contributors)
- [Legal](#legal)

<!-- docs-toc:end -->

> **Kevin K. Le** ([LinkedIn](https://linkedin.com/in/lekevin1)) — Founder,
> Founding Engineer, and Current Lead Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon.
>
> **Kellen Snider** — Founding Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon. His vision, ideas, and dedication
> during TrustLedger's Ethereum development were invaluable to the codebase we
> build on today.
>
> See [`CREDITS.md`](CREDITS.md).

This document explains TrustLedger escrow state transitions. Read it when
reviewing user flows, testing lifecycle behavior, or integrating a client with
`TrustLedger.sol`.

## Statuses

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Status      | Meaning                                                     |
| ----------- | ----------------------------------------------------------- |
| `PENDING`   | A proposal exists but escrow funds have not been deposited. |
| `ACTIVE`    | Escrow funds are deposited and the freelancer can work.     |
| `SUBMITTED` | The freelancer submitted proof of work.                     |
| `APPROVED`  | The client approved work; the holdback remains in warranty. |
| `DISPUTED`  | Arbitration owns the outcome.                               |
| `RESOLVED`  | Funds were released or an arbitration ruling executed.      |
| `CANCELLED` | The proposal or escrow was cancelled before completion.     |

## Freelancer-Proposed Flow

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Use this flow when the freelancer writes the offer and the client decides
whether to fund it.

```text
proposeContract
      |
      v
PENDING -- acceptContract --> ACTIVE -- submitProofOfWork --> SUBMITTED
   |                              |                              |
   |                              |                              +-- approveWork --> APPROVED
   |                              |                              |
   |                              |                              +-- disputeWork --> DISPUTED
   |                              |                              |
   |                              |                              +-- claimAfterAcceptanceWindow
   |                              |                                  --> RESOLVED
   |                              |
   |                              +-- claimAfterDeadlineMiss --> CANCELLED
   |
   +-- cancelProposal --> CANCELLED
   |
   +-- rejectContract --> CANCELLED
```

### Proposal

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The freelancer calls `proposeContract` with a client address, amount, project
duration, warranty period, contract hash, contract URI, token address, and
optional previous contract ID. The function does not escrow funds. Native-token
escrows use the zero address. ERC-20 escrows require a token that
`allowedTokens[token]` already marks as allowed.

The contract stores a buffered deadline using `MIN_BUFFER_FACTOR`, which is
`1100` basis points. That gives the freelancer 110 percent of the estimated
duration.

### Funding

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The client calls `acceptContract`. For native-token escrows, `msg.value` must
equal the contract amount. For ERC-20 escrows, `msg.value` must be zero and the
client must approve `TrustLedger` to transfer the escrow amount before calling.

### Cancellation

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Before funding, the freelancer can call `cancelProposal` and the client can call
`rejectContract`. Both paths move the escrow to `CANCELLED`.

## Client-Proposed Flow

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Use this flow when the client writes the offer and the freelancer decides
whether to accept it.

```text
proposeContractByClient
      |
      v
PENDING -- acceptContractByFreelancer --> PENDING -- fundContractByClient --> ACTIVE
   |                                           |
   |                                           +-- rejectContractByFreelancer --> CANCELLED
   |
   +-- withdrawClientProposal --> CANCELLED
```

The client-proposed path is two-step acceptance plus funding.
`acceptContractByFreelancer` marks the freelancer as accepted but does not take
funds. `fundContractByClient` deposits funds and moves the escrow to `ACTIVE`.

## Work Submission

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The freelancer calls `submitProofOfWork` from `ACTIVE`. The proof hash and proof
URI are stored, and the escrow moves to `SUBMITTED`. The contract then waits for
client approval, dispute, or the acceptance-window claim path.

## Approval And Holdback

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The client calls `approveWork` from `SUBMITTED`. The contract pays the
freelancer the escrow amount minus the holdback and moves to `APPROVED`. The
holdback remains in escrow until the warranty period expires.

After the warranty deadline, the freelancer calls `claimWarrantyFunds`. That
pays the holdback and moves the escrow to `RESOLVED`.

## Deadline Claims

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Claim                        | Caller     | State                               | Result                                         |
| ---------------------------- | ---------- | ----------------------------------- | ---------------------------------------------- |
| `claimAfterDeadlineMiss`     | Client     | `ACTIVE` after project deadline     | Refunds escrow funds and cancels the contract. |
| `claimAfterAcceptanceWindow` | Freelancer | `SUBMITTED` after acceptance window | Pays the freelancer and resolves the contract. |
| `claimWarrantyFunds`         | Freelancer | `APPROVED` after warranty deadline  | Pays holdback and resolves the contract.       |

## Disputes

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Either the client or freelancer can call `disputeWork` when the escrow is in a
disputable state. The escrow moves to `DISPUTED`, and `TrustLedger` opens an
arbitration dispute.

Native-token escrows carve the juror fee pool from escrowed funds. ERC-20
escrows require the caller to provide the ETH juror fee separately because the
escrowed asset is not ETH.

Read [Arbitration](ARBITRATION.md) for the dispute flow.

## Ratings

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

After completion paths, `submitRating` lets each party rate the counterparty
from `1` to `100`. When arbitration executes a ruling, `TrustLedger` also
records automatic low-score ratings in extreme outcomes:

- Completion at least `80` records a low client score.
- Completion at most `20` records a low freelancer score.

Ratings are sent to `ReputationRegistry` only after `initReputationRegistry` has
configured that registry.

## Authors and Contributors

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **Kevin K. Le** — Founder, Founding Engineer, and Current Lead Engineer
  ([LinkedIn](https://www.linkedin.com/in/lekevin1))
- **Kellen Snider** — Founding Engineer
  ([LinkedIn](https://www.linkedin.com/in/kellen-snider-683396256/))

See [`CREDITS.md`](CREDITS.md) for the complete acknowledgement list.

## Legal

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

This document is part of TrustLedger, an open-source decentralized escrow and
arbitration protocol. Use of this software and documentation is subject to the
[Terms and Conditions](TERMS_AND_CONDITIONS.md),
[Privacy Policy](PRIVACY_POLICY.md), and [Risk Disclosure](RISK_DISCLOSURE.md).
See [`LEGAL.md`](LEGAL.md) for the full compliance and licensing overview.
