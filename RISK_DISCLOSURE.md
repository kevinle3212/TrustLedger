# TrustLedger — Risk Disclosure

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

**Effective Date:** June 9, 2026 **Last Updated:** June 9, 2026 **Version:**
2.0.0

---

> **IMPORTANT:** This Risk Disclosure describes material risks associated with
> using the TrustLedger Platform. It is not exhaustive. Additional risks not
> described here may exist. Read this document carefully before using the
> Services. By using the Services, You represent that You have read, understood,
> and accepted all risks described herein.

---

## 1. Introduction

TrustLedger operates at the intersection of blockchain technology, smart
contracts, cryptocurrency, decentralized systems, and marketplace interactions.
Each of these domains carries significant risks. This document is designed to
make those risks transparent. **You should not use the Platform unless you fully
understand and accept the risks described below.**

All capitalized terms have the meanings set forth in the Terms and Conditions.

---

## 2. Financial Risk

**2.1 Cryptocurrency Volatility.** Cryptocurrency values are highly volatile.
Assets deposited into an escrow may decline substantially in value between
deposit and release. You may receive less value than you deposited in economic
terms due to market movements. The Operator makes no representation regarding
the future value of any cryptocurrency.

**2.2 Irreversibility of Transactions.** Blockchain Transactions are
irreversible once confirmed. If You send funds to an incorrect address, fund the
wrong escrow, or make any other Transaction error, those funds may be
permanently lost with no possibility of recovery. The Operator cannot reverse
Transactions.

**2.3 Loss of All Funds.** Smart contract bugs, exploits, reentrancy attacks,
oracle manipulation, and other technical failures could result in partial or
total loss of all funds deposited into the Escrow Contract. You should not
deposit funds you cannot afford to lose.

**2.4 Gas Fee Risk.** Blockchain Transaction fees (gas fees) are variable,
unpredictable, and subject to rapid change. High gas fees may make Transactions
expensive or economically impractical. Failed Transactions may still consume
gas.

**2.5 Tax Risk.** Cryptocurrency transactions may trigger taxable events in Your
jurisdiction, including income tax, capital gains tax, and other obligations.
You are solely responsible for all tax obligations arising from Your use of the
Services.

**2.6 No Payment Guarantee.** The Operator does not guarantee that any payment
will be made, any escrow will be funded, or any financial obligation will be
fulfilled. Counterparties may fail to perform.

---

## 3. Smart Contract Risk

**3.1 Unaudited Code.** **THE SMART CONTRACTS HAVE NOT BEEN INDEPENDENTLY
AUDITED AS OF THE EFFECTIVE DATE.** Smart contracts are software and may contain
bugs, logical errors, mathematical errors, or other defects. These defects could
result in: loss of funds; frozen funds; incorrect contract state transitions;
unauthorized access by third parties; or other adverse outcomes.

**3.2 Immutability of Deployed Contracts.** Once deployed on a blockchain, Smart
Contracts cannot be easily modified. If a bug is discovered, the Platform may
require Users to migrate to new contract deployments. Funds in old contracts may
not automatically migrate.

**3.3 Unintended State Transitions.** Smart contracts execute exactly as
programmed. Edge cases, unexpected inputs, or interactions between contracts may
produce unintended outcomes. The Operator does not guarantee that all possible
Smart Contract execution paths have been tested.

**3.4 Upgrade Risk.** The Platform may deploy upgraded or replacement Smart
Contracts. Interactions between old and new contract versions may produce
unexpected results.

**3.5 ERC-20 Token Compatibility.** The Escrow Contract supports certain ERC-20
tokens. Fee-on-transfer tokens, rebasing tokens, pausable tokens, upgradeable
tokens, and tokens with non-standard behavior may interact unexpectedly with the
Escrow Contract, potentially resulting in loss of funds or incorrect escrow
accounting.

---

## 4. Blockchain Network Risk

**4.1 Network Congestion.** High network activity may delay Transaction
confirmation. Time-sensitive contract actions (such as approving work within an
acceptance window) may be affected by network congestion.

**4.2 Fork Risk.** Blockchain networks may undergo forks or protocol upgrades
that affect Smart Contract behavior, accessibility, or asset values.

**4.3 Chain Reorganization.** Blockchain reorganizations ("reorgs") may
temporarily reverse apparently confirmed Transactions. For high-value
Transactions, You should wait for sufficient confirmations before treating them
as final.

**4.4 Validator Risk.** Block producers (validators or miners) may engage in MEV
extraction, sandwich attacks, or front-running that affects Your Transactions.
The Operator has no control over validator behavior.

**4.5 Network Availability.** Blockchain networks may experience outages,
performance degradation, or consensus failures. The Operator has no control over
blockchain network availability.

---

## 5. Technology and Infrastructure Risk

**5.1 Platform Availability.** The Frontend Application, API routes, email
services, and other Platform infrastructure may experience downtime, outages,
bugs, or performance degradation. The Operator does not guarantee continuous
availability.

**5.2 Data Loss.** Non-blockchain data stored by the Platform may be lost due to
infrastructure failures, data corruption, or other causes. On-chain data is
persistent but may become inaccessible through the Frontend Application if the
Platform experiences outages.

**5.3 Third-Party Service Failures.** The Platform depends on third-party
services including blockchain node providers, email delivery, IPFS pinning, and
cloud hosting. Failure of any third-party service may affect Platform
availability and functionality.

**5.4 IPFS and Decentralized Storage.** Files stored on IPFS may become
inaccessible if pinning services cease operations or discontinue pins. Content
on decentralized storage networks is not guaranteed to persist indefinitely.

**5.5 Oracle Risk.** Oracle services providing price data may fail, produce
inaccurate data, or be manipulated. Decisions made on the basis of oracle data
may be adversely affected.

---

## 6. Security Risk

**6.1 Cybersecurity.** The Platform may be targeted by cyberattacks, including
DDoS attacks, smart contract exploits, phishing campaigns, and account
takeovers. No system is completely secure.

**6.2 Private Key Risk.** Loss or compromise of Your Wallet's private key or
seed phrase results in permanent, irrecoverable loss of all assets in that
Wallet. The Operator cannot recover lost keys.

**6.3 Phishing and Social Engineering.** Bad actors may attempt to steal Your
credentials, seed phrases, or funds through phishing emails, fake websites,
social engineering, or impersonation attacks. You should verify all URLs,
contract addresses, and communications independently.

**6.4 Wallet Software Vulnerabilities.** Wallet software, browser extensions,
and hardware wallet firmware may contain vulnerabilities. Keeping software
updated reduces but does not eliminate this risk.

**6.5 Data Breach.** The Operator's infrastructure may be subject to
unauthorized access. Data breaches may expose non-public data such as email
addresses and usage information.

---

## 7. Counterparty and Marketplace Risk

**7.1 No Identity Verification.** The Operator does not verify the identity,
credentials, qualifications, or good faith of any User. You may transact with
persons who misrepresent themselves.

**7.2 Performance Risk.** Freelancers may fail to deliver promised work. Clients
may fail to fund escrows or release payments. There is no guarantee that any
Counterparty will perform their obligations.

**7.3 Fraud and Scam Risk.** The Platform may attract fraudsters, scammers, and
malicious actors. You are solely responsible for evaluating Counterparties and
protecting yourself from fraud.

**7.4 Reputation Gaming.** Reputation scores on the Platform may not accurately
reflect a User's actual trustworthiness or performance. Ratings may be gamed,
fabricated, or reflect personal conflicts rather than objective performance
assessments.

**7.5 Juror Risk.** Jurors may collude, act in bad faith, lack sufficient
knowledge to evaluate evidence, or make incorrect determinations. Dispute
outcomes produced by the Platform's arbitration system are not guaranteed to be
fair, accurate, or legally enforceable.

---

## 8. Legal and Regulatory Risk

**8.1 Regulatory Uncertainty.** The legal status of blockchain technology,
cryptocurrency, smart contracts, and decentralized platforms varies
significantly by jurisdiction and is subject to rapid change. Regulatory changes
may affect the availability, legality, or operation of the Services in Your
jurisdiction.

**8.2 Lack of Legal Enforceability.** Contracts created through the Platform may
or may not be legally enforceable in Your jurisdiction. On-chain dispute
outcomes have no formal legal standing unless separately agreed upon.

**8.3 Sanctions Risk.** If You interact with counterparties subject to economic
sanctions, You may violate applicable sanctions laws and face significant legal
consequences.

**8.4 Jurisdictional Variation.** Laws applicable to Your use of the Platform
may vary significantly depending on Your location, the location of Your
Counterparty, and the location of the Platform's infrastructure.

**8.5 Tax Uncertainty.** Tax treatment of cryptocurrency and blockchain
transactions is unsettled in many jurisdictions. Unexpected tax liabilities may
arise from Your use of the Platform.

---

## 9. AI and Automation Risk

**9.1 AI Output Errors.** AI-generated content or analysis may be inaccurate,
incomplete, or misleading. Reliance on AI outputs without independent
verification may lead to harmful decisions.

**9.2 Automated Decision Risk.** Smart contracts and cron-based automations
execute according to their programmed logic regardless of external
circumstances. Automated actions may occur at inopportune times or produce
unintended results.

**9.3 AI Limitation.** AI systems are limited by their training data and
architecture. They may fail to account for current events, jurisdiction-specific
requirements, or the specific facts of Your situation.

---

## 10. Pseudorandomness Risk

Where the Arbitration Smart Contract uses pseudo-random juror selection based on
blockchain parameters (`block.prevrandao`, `block.timestamp`, and dispute ID),
this selection is not equivalent to cryptographically secure randomness. Block
producers may theoretically influence committee composition. This is an inherent
limitation of the non-VRF arbitration path.

---

## 11. Platform Continuity and Abandonment Risk

**11.1 Project Discontinuation.** TrustLedger is a student project operated by a
university organization. The Operator may discontinue the Platform, cease
development, shut down the Frontend Application, discontinue hosted API
services, or abandon the project at any time, for any reason, including
graduation of maintainers, lack of funding, regulatory pressure, or changed
priorities. In such event:

(a) The Frontend Application and hosted infrastructure may become unavailable.
On-chain Smart Contracts would remain deployed on the blockchain but would no
longer be accessible through the official user interface.

(b) Funds held in Smart Contracts at the time of discontinuation remain subject
to the Smart Contract's on-chain logic. The Operator cannot return, retrieve, or
unilaterally release such funds.

(c) Email notification services, IPFS pinning, oracle feeds, and other hosted
services may cease without warning.

**YOU SHOULD NOT RELY ON THE CONTINUED OPERATION OF THE PLATFORM FOR THE
MANAGEMENT OF TIME-SENSITIVE CONTRACTUAL OBLIGATIONS. YOU SHOULD MAINTAIN DIRECT
ACCESS TO YOUR WALLET AND THE ABILITY TO INTERACT WITH SMART CONTRACTS DIRECTLY,
WITHOUT RELYING ON THE FRONTEND APPLICATION.**

**11.2 No Recovery Guarantee.** In the event of Platform discontinuation, there
is no guarantee that any recovery mechanism, migration path, or fund-return
process will be made available. Funds in Smart Contracts that require human
intervention to release — such as disputed escrows awaiting arbitration — may
become permanently inaccessible if the Platform is discontinued before the
dispute is resolved.

---

## 12. Regulatory Classification Risk

**12.1 Platform Regulatory Classification.** The Operator does not believe that
it operates a regulated financial service. However, regulators in various
jurisdictions may reach a different conclusion and may classify the Platform or
specific features (including the escrow, arbitration, and payment functions) as:

(a) money transmission requiring licensure;

(b) securities exchange or alternative trading system activity requiring
registration;

(c) investment advisory services;

(d) virtual asset service provider (VASP) activity subject to AML/CTF
regulation; or

(e) any other regulated financial service category.

If regulators take such a position, the Platform may be required to cease
operations, modify features significantly, obtain licenses, or pay penalties.
Such regulatory action could affect Your ability to access funds in Smart
Contracts or to continue using the Platform.

**12.2 User's Own Regulatory Obligations.** Depending on how You use the
Platform — including the volume, frequency, and nature of your transactions —
You may yourself be subject to regulatory requirements, including requirements
to obtain a money transmitter license, register as a VASP, comply with AML/KYC
obligations, or file regulatory reports. You are solely responsible for
determining and satisfying all regulatory obligations applicable to You.

**12.3 Cross-Border Regulatory Risk.** Transactions on the Platform may cross
multiple jurisdictions. The legal and regulatory requirements applicable to such
transactions may be uncertain, inconsistent, or in conflict across
jurisdictions.

---

## 13. Cross-Chain Bridge Risk

If You use cross-chain bridges, relay networks, wrapped token protocols, or
cross-chain interoperability solutions in connection with the Platform
(including to move assets from one supported network to another):

(a) Bridges are independent third-party systems with their own smart contract
risks, validator risks, and security histories. Bridge exploits have
historically resulted in catastrophic losses.

(b) Bridged assets may not be fungible with or equivalent to their native
equivalents on the destination chain.

(c) The Operator has no control over or responsibility for any bridge protocol,
and makes no recommendation regarding the safety or reliability of any bridge.

(d) Funds in transit through a bridge are outside the control of both the
Operator and the Escrow Contract until received at the destination.

---

## 14. Governance and Protocol Attack Risk

If the Platform introduces token-based governance, DAO voting, or other on-chain
governance mechanisms:

(a) **Governance Attacks.** Token-based governance systems may be subject to
attacks in which a malicious actor accumulates sufficient governance tokens to
pass proposals that harm other token holders, alter Platform parameters,
redirect funds, or upgrade contracts in unintended ways.

(b) **Voter Apathy.** Low participation in governance votes may allow a small
number of token holders to make decisions affecting all Users.

(c) **Flash Loan Governance Attacks.** Governance systems may be vulnerable to
flash loan attacks that temporarily inflate a voter's token balance to pass
malicious proposals within a single block.

The Operator makes no guarantee that governance systems will be secure, fair, or
free from manipulation.

---

## 15. Summary: You Assume All Risks

**BY USING THE TRUSTLEDGER PLATFORM, YOU EXPRESSLY ACKNOWLEDGE AND ASSUME ALL
RISKS DESCRIBED IN THIS DOCUMENT AND ALL OTHER RISKS ASSOCIATED WITH BLOCKCHAIN
TECHNOLOGY, SMART CONTRACTS, CRYPTOCURRENCY, DECENTRALIZED SYSTEMS, MARKETPLACE
INTERACTIONS, AND ONLINE PLATFORMS. YOU AGREE THAT:**

- You are solely responsible for all financial, legal, business, and operational
  decisions made in connection with the Platform.
- You have evaluated the risks and determined that they are acceptable to You.
- You will not hold the Operator responsible for any losses, damages, or harms
  arising from the risks described in this document or from risks not described
  here.
- The Operator's liability is limited to the maximum extent permitted by
  applicable law as set forth in the Terms and Conditions.

---

## 16. Related Documents

This Risk Disclosure should be read together with:

- [Terms and Conditions](TERMS_AND_CONDITIONS.md)
- [Disclaimer](DISCLAIMER.md)
- [Acceptable Use Policy](ACCEPTABLE_USE_POLICY.md)
- [Privacy Policy](PRIVACY_POLICY.md)

---

_This Risk Disclosure (Version 2.0.0) was last reviewed and updated on June 9,
2026, following a comprehensive legal red-team audit. Changes include: addition
of Section 11 (Platform Continuity and Abandonment Risk), Section 12 (Regulatory
Classification Risk, including user's own regulatory obligations and
cross-border risk), Section 13 (Cross-Chain Bridge Risk), and Section 14
(Governance and Protocol Attack Risk). Summary and Related Documents renumbered
accordingly._

## Authors and Contributors

- **Kevin K. Le** — Founder, Founding Engineer, and Current Lead Engineer
  ([LinkedIn](https://www.linkedin.com/in/lekevin1))
- **Kellen Snider** — Founding Engineer
  ([LinkedIn](https://www.linkedin.com/in/kellen-snider-683396256/))

See [`CREDITS.md`](CREDITS.md) for the complete acknowledgement list.
