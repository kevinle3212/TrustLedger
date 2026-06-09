# TrustLedger — Terms and Conditions

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

**Effective Date:** June 9, 2026 **Last Updated:** June 9, 2026 **Version:**
3.0.0

---

> **IMPORTANT NOTICE:** Please read these Terms and Conditions carefully before
> accessing or using the TrustLedger Platform or any of its Services. By
> accessing or using the Services in any manner, you agree to be legally bound
> by these Terms. If you do not agree, you must immediately cease all use of the
> Services. These Terms contain a binding arbitration clause, a class-action
> waiver, a jury trial waiver, and extensive limitations on the Operator's
> liability.
>
> **SMART CONTRACT NOTICE:** The Smart Contracts associated with this Platform
> have not been independently audited as of the Effective Date. Do not deposit
> funds you cannot afford to lose. You assume all risk of loss arising from your
> use of unaudited smart contracts.

---

## Table of Contents

1. [Definitions](#1-definitions)
2. [Eligibility and Account Creation](#2-eligibility-and-account-creation)
3. [User Accounts and Credentials](#3-user-accounts-and-credentials)
4. [Acceptable Use Policy](#4-acceptable-use-policy)
5. [Intellectual Property](#5-intellectual-property)
6. [Relationship Between Apache-2.0 and These Terms](#6-relationship-between-apache-20-and-these-terms)
7. [User Content and Submissions](#7-user-content-and-submissions)
8. [Feedback and Enhancement Requests](#8-feedback-and-enhancement-requests)
9. [Blockchain, Smart Contracts, and Cryptocurrency](#9-blockchain-smart-contracts-and-cryptocurrency)
10. [Escrow and Contract Workflow](#10-escrow-and-contract-workflow)
11. [Arbitration and Dispute Resolution Features](#11-arbitration-and-dispute-resolution-features)
12. [Reputation System](#12-reputation-system)
13. [Marketplace and Collaboration Disclaimers](#13-marketplace-and-collaboration-disclaimers)
14. [Financial Platform Protections](#14-financial-platform-protections)
15. [No Fiduciary Relationship](#15-no-fiduciary-relationship)
16. [Anti-Fraud, Anti-Scam, and Due Diligence Obligations](#16-anti-fraud-anti-scam-and-due-diligence-obligations)
17. [Decision-Making Disclaimer and User Responsibility](#17-decision-making-disclaimer-and-user-responsibility)
18. [AI, Automation, and Generated Outputs](#18-ai-automation-and-generated-outputs)
19. [Storage Systems, IPFS, and File Handling](#19-storage-systems-ipfs-and-file-handling)
20. [Oracle and Price-Feed Services](#20-oracle-and-price-feed-services)
21. [Authentication, Magic Links, and Email Services](#21-authentication-magic-links-and-email-services)
22. [Privacy and Data Handling](#22-privacy-and-data-handling)
23. [Security](#23-security)
24. [Third-Party Services and Integrations](#24-third-party-services-and-integrations)
25. [No Professional Advice](#25-no-professional-advice)
26. [Future Features and Platform Evolution](#26-future-features-and-platform-evolution)
27. [Disclaimers of Warranties](#27-disclaimers-of-warranties)
28. [Limitation of Liability](#28-limitation-of-liability)
29. [Indemnification](#29-indemnification)
30. [Suspension and Termination](#30-suspension-and-termination)
31. [Modifications to the Services and These Terms](#31-modifications-to-the-services-and-these-terms)
32. [DMCA and Copyright Complaints](#32-dmca-and-copyright-complaints)
33. [Governing Law, Venue, and Dispute Resolution](#33-governing-law-venue-and-dispute-resolution)
34. [General Provisions](#34-general-provisions)
35. [Contact Information](#35-contact-information)
36. [Version History](#36-version-history)

---

## 1. Definitions

For the purposes of these Terms and Conditions ("**Terms**"), the following
definitions apply. Defined terms may be used in the singular or the plural.

**1.1 "Agreement"** means these Terms and Conditions in their entirety, together
with any policies, guidelines, schedules, supplemental terms, or other documents
incorporated by reference herein, including without limitation the Privacy
Policy, Acceptable Use Policy, Risk Disclosure, DMCA Policy, Trademark Policy,
Content Policy, and Community Guidelines published on or in connection with the
Platform.

**1.2 "AI Output"** means any content, suggestion, result, text, analysis,
recommendation, prediction, classification, code, label, summary, or other
output generated, produced, or returned by any artificial intelligence, machine
learning, large language model, or automated system integrated with or
accessible through the Services.

**1.3 "Arbitration Smart Contract"** means the `Arbitration.sol` smart contract
deployed on an EVM-compatible network, which facilitates commit-reveal juror
voting, dispute rulings, appeal procedures, and associated juror reward and
slashing logic.

**1.4 "Blockchain"** means any distributed public ledger, including but not
limited to Ethereum, Arbitrum One, Base, and Optimism, upon which Smart
Contracts deployed or associated with TrustLedger may operate, as well as any
future compatible networks added to the Platform.

**1.5 "Content"** means any data, text, files, documents, images, evidence,
contract proposals, proof-of-work submissions, ratings, commentary, metadata,
URIs, links, hashes, or other materials uploaded, submitted, published,
transmitted, stored, or otherwise made available through the Services by any
person or entity.

**1.6 "Contributor"** means any individual or entity that has submitted source
code, documentation, tests, tooling, or other contributions to the TrustLedger
repository under the terms of the Apache License, Version 2.0.

**1.7 "Counterparty"** means any User with whom You interact, negotiate, enter
into an agreement, or transact through the Services, including but not limited
to freelancers, clients, jurors, vendors, contractors, and other participants.

**1.8 "Effective Date"** means the date set forth at the top of this document,
or the date on which You first access or use the Services, whichever is earlier.

**1.9 "ERC-20 Token"** means a fungible cryptographic token conforming to the
ERC-20 standard on an EVM-compatible network.

**1.10 "Escrow Contract"** means the `TrustLedger.sol` smart contract deployed
on an EVM-compatible blockchain, which manages escrow funds, project deadlines,
warranty holds, status transitions, ratings, and related contract lifecycle
state associated with freelance agreements.

**1.11 "EVM"** means the Ethereum Virtual Machine or any compatible execution
environment on a supported or future-supported blockchain network.

**1.12 "Feedback"** means any bug reports, feature requests, suggestions, ideas,
improvements, enhancement requests, commentary, or other communications provided
by You to the Operator regarding the Platform or Services.

**1.13 "Frontend Application"** means the web-based user interface built on
Next.js that provides access to the Services, including contract creation,
wallet interaction, dashboard views, arbitration interfaces, juror panels, and
related workflows, whether accessed at any hosted URL or deployed locally.

**1.14 "IPFS"** means the InterPlanetary File System, a decentralized
peer-to-peer content-addressed storage protocol used in connection with the
Services for storing evidence, proof-of-work URIs, and contract document
references.

**1.15 "JurorRegistry Contract"** means the `JurorRegistry.sol` smart contract
that tracks juror stake, eligibility, active locks, cooldowns, and slashing
within the Platform's arbitration subsystem.

**1.16 "Licensed Code"** means the source code and associated documentation
files contained in the TrustLedger repository that are made available under the
Apache License, Version 2.0.

**1.17 "Marks"** means the name "TrustLedger," all associated logos, icons,
graphic marks, trade dress, service marks, and all other branding elements
associated with the Platform, whether or not registered as trademarks.

**1.18 "Operator," "we," "us," or "our"** means the individual, organization, or
entity that operates, deploys, or makes the Services available, including but
not limited to TrustLedger and its maintainers, contributors, affiliates,
agents, successors, and assigns.

**1.19 "Oracle"** means any external price-feed service, data provider, on-chain
oracle contract, or automated data mechanism used to supply exchange rate,
market data, or other external information to the Services.

**1.20 "Platform"** means the TrustLedger software system in its entirety,
including the Frontend Application, Smart Contracts, API routes, backend
services, documentation, tooling, storage integrations, email services,
blockchain interfaces, cron jobs, oracle integrations, and all related technical
infrastructure and components.

**1.21 "Released Parties"** means the Operator, its affiliates, licensors,
service providers, Contributors, maintainers, employees, agents, contractors,
officers, directors, successors, and assigns, collectively.

**1.22 "ReputationRegistry Contract"** means the `ReputationRegistry.sol` smart
contract that stores numeric ratings and reputation recovery state for Users.

**1.23 "Services"** means, collectively, all features, functionality, tools,
interfaces, APIs, Smart Contracts, notifications, cron jobs, email delivery,
oracle data, storage services, AI-generated outputs, analytics, documentation,
and related resources made available by or through the Platform, whether
accessed via web browser, API, command-line interface, wallet connection, or any
other means, now or in the future.

**1.24 "Smart Contracts"** means the Solidity-based programs deployed on
supported EVM-compatible blockchains in connection with the Platform, including
but not limited to the Escrow Contract, Arbitration Smart Contract,
JurorRegistry Contract, and ReputationRegistry Contract.

**1.25 "Third-Party Services"** means all external services, platforms, APIs,
protocols, networks, and providers that the Platform integrates with or depends
upon but that are operated by parties other than the Operator.

**1.26 "Transaction"** means any on-chain action submitted to a blockchain
network through or in connection with the Services, including but not limited to
escrow funding, work submission, work approval, dispute opening, juror voting,
evidence submission, fund release, warranty claims, and token transfers.

**1.27 "User," "you," or "your"** means any individual, entity, organization, or
automated agent that accesses, uses, browses, deploys, integrates, or otherwise
interacts with the Platform or any portion of the Services, in any capacity,
including as a freelancer, client, juror, developer, researcher, or observer.

**1.28 "User Content"** means any Content that You create, upload, submit, or
transmit through the Services, including evidence submissions, proof-of-work
URIs, contract document hashes, dispute summaries, ratings, and
wallet-associated metadata.

**1.29 "Wallet"** means any externally owned account (EOA), smart-contract
wallet, or multi-signature wallet compatible with EVM networks, accessed through
wallet-connection software (including hardware wallets, browser-extension
wallets, or WalletConnect-compatible mobile wallets), used to interact with the
Services.

---

## 2. Eligibility and Account Creation

**2.1 Minimum Age.** You must be at least eighteen (18) years of age, or the age
of legal majority in Your jurisdiction, whichever is greater, to access or use
the Services. By accessing or using the Services, You represent and warrant that
You meet this minimum age requirement. The Operator reserves the right to
terminate access of any User reasonably believed to be under the applicable
minimum age.

**2.2 Legal Capacity.** You represent and warrant that You have full legal
capacity to enter into this Agreement and to be legally bound by its terms. If
You are accessing the Services on behalf of a business, organization, or other
legal entity, You represent and warrant that: (a) You have the authority to bind
that entity to these Terms; (b) the entity has not been previously suspended or
banned from the Services; and (c) the entity's use of the Services complies with
all applicable laws. References to "you" or "your" shall include such entity.

**2.3 Jurisdictional Compliance.** You represent and warrant that Your use of
the Services does not violate any applicable law, regulation, treaty, or
governmental order in Your jurisdiction. You are solely responsible for
determining whether the Services are legal to use in Your jurisdiction and for
complying with all applicable local, state, national, and international laws,
regulations, tax obligations, and reporting requirements relating to Your use of
the Services, including without limitation laws governing cryptocurrency
transactions, financial services, digital assets, money transmission,
securities, freelance labor arrangements, consumer protection, and data privacy.

**2.4 Restricted Persons.** The Services are not available to, and may not be
used by: (a) individuals or entities located in, incorporated in, or ordinarily
resident in any jurisdiction subject to comprehensive economic sanctions
administered by the United States Office of Foreign Assets Control (OFAC), the
United Nations Security Council, the European Union, His Majesty's Treasury, or
any other applicable authority; (b) individuals or entities designated on the
Specially Designated Nationals and Blocked Persons List (SDN List), the
Consolidated List of Financial Sanctions Targets, or any other list of
prohibited or restricted parties maintained by such authorities; or (c)
individuals or entities barred from using the Services under applicable law. By
using the Services, You represent and warrant that You do not fall within any of
the foregoing categories.

**2.5 No Registration Required.** The Services may be accessible without formal
account registration, relying instead on wallet-based authentication or
email-verified magic-link sessions. Connecting Your Wallet to the Services or
providing Your email address for a magic link constitutes Your acceptance of and
agreement to be legally bound by these Terms.

**2.6 AML/KYC.** The Operator does not currently operate a formal
anti-money-laundering (AML) or know-your-customer (KYC) verification program
because the Platform, as presently configured, is a technology tool and not a
regulated financial service in the Operator's assessment. This assessment may
change as regulations evolve, and the Operator makes no representation that its
current configuration is compliant with the laws of any particular jurisdiction.
You acknowledge that the Operator reserves the right, at its sole discretion, to
implement identity verification, AML screening, KYC procedures, sanctions
screening, or compliance controls at any time, without prior notice, and that
You may be required to complete such procedures as a condition of continued
access to the Services. You are solely responsible for ensuring that Your use of
the Platform complies with all AML, CTF, and financial-services laws applicable
to You in Your jurisdiction.

---

## 3. User Accounts and Credentials

**3.1 Wallet Ownership and Security.** You are solely and exclusively
responsible for maintaining the confidentiality and security of Your Wallet's
private keys, seed phrases, passwords, hardware tokens, and any other
credentials used to access or control Your Wallet or the Services. The Operator
does not and cannot access, store, retrieve, recover, or restore Your private
keys, seed phrases, or Wallet passwords under any circumstances whatsoever. Loss
or compromise of Your private key or seed phrase results in permanent and
irrecoverable loss of all assets controlled by that Wallet, and the Operator has
no ability to remedy such loss.

**3.2 Magic Link Sessions.** Where the Platform provides email-based magic link
authentication, You are responsible for maintaining the security of the email
account used to receive such links. Magic links are time-limited and single-use.
You must not share magic link URLs with any third party. Sharing a magic link
URL constitutes the same as sharing Your session credentials.

**3.3 Account Security Obligations.** You agree to: (a) use a unique,
sufficiently complex password or passphrase for any email account or service
account associated with the Platform; (b) enable all available security
protections on Your Wallet and email accounts, including hardware security
modules, two-factor authentication, and multi-factor authentication where
supported; (c) maintain the security of all devices, browsers, and applications
used to access the Services; (d) keep all wallet software, browser extensions,
firmware, and operating systems updated to current security patches; (e)
immediately notify the Operator of any known or suspected unauthorized access to
Your Wallet, session, or email account; and (f) never re-use passwords across
multiple services or platforms.

**3.4 Responsibility for Activity.** You are fully and exclusively responsible
for all activity occurring through Your Wallet or any session associated with
Your email address, regardless of whether You authorized such activity. The
Operator shall have no liability whatsoever for any losses, damages, or harms
arising from unauthorized access to Your Wallet or session, including losses
resulting from failure to maintain adequate security measures, compromise of
Your device, phishing attacks, or social engineering.

**3.5 Account Suspension and Termination.** The Operator reserves the right, in
its sole and absolute discretion, to suspend, restrict, or terminate Your access
to the Services at any time, for any reason or no reason, with or without prior
notice, including without limitation for violation of these Terms, suspected
fraudulent or harmful activity, legal requirement, law enforcement request, or
operational necessity.

**3.6 Impersonation Prohibited.** You may not use the Services to impersonate
any person, entity, or organization, or to misrepresent Your identity, wallet
ownership, professional qualifications, or affiliation. Impersonation of the
Operator, its team members, Contributors, or other Users is strictly prohibited.

**3.7 Username and Identity.** To the extent the Services permit display names,
usernames, or profile identifiers, You agree that such identifiers will not: (a)
be misleading as to Your identity; (b) infringe any third party's trademark,
trade name, or other intellectual property rights; (c) impersonate any real
person or entity; (d) contain offensive, obscene, or otherwise objectionable
content; or (e) incorporate the Marks without express written permission.

**3.8 No Account Transfer.** You may not sell, transfer, sublicense, or assign
Your access rights, session credentials, or any associated Wallet-based access
to any third party without the prior written consent of the Operator. Any
purported transfer in violation of this restriction is void.

**3.9 Abandoned Sessions.** The Operator has no obligation to maintain records
of inactive sessions, email-linked profiles, or other non-wallet data associated
with Users who have not accessed the Services for an extended period. The
Operator may purge inactive session data at its discretion without notice.

---

## 4. Acceptable Use Policy

**4.1 Permitted Use.** Subject to Your compliance with these Terms, the Operator
grants You a limited, non-exclusive, non-transferable, revocable right to access
and use the Services for lawful purposes consistent with the intent of the
Platform: facilitating freelance escrow agreements, participating in the
arbitration system, building on-chain reputation, and related activities.

**4.2 Prohibited Activities — General.** You agree not to use the Services,
directly or indirectly, to:

(a) **Illegal Conduct.** Violate any applicable federal, state, local,
international, or foreign law, statute, ordinance, regulation, rule, code,
treaty, or government order, including without limitation laws and regulations
regarding financial services, cryptocurrency, digital assets, money
transmission, anti-money-laundering (AML), counter-terrorism financing (CTF),
consumer protection, data privacy, export controls, or employment;

(b) **Fraud and Deception.** Engage in fraud, deception, misrepresentation,
false advertising, phishing, social engineering, impersonation, identity theft,
credential harvesting, or any other dishonest act intended to harm others or
obtain anything of value through deceptive means;

(c) **Financial Fraud.** Engage in financial fraud, investment fraud, securities
fraud, advance-fee fraud, recovery fraud, romance fraud, job scams, invoice
fraud, account-takeover fraud, payment redirection fraud, or any scheme designed
to defraud clients, freelancers, jurors, or any other Users of the Platform;

(d) **Unauthorized Access.** Access, tamper with, or use any portion of the
Services, networks, systems, or infrastructure without authorization, including
attempting to bypass, circumvent, or defeat authentication mechanisms, access
controls, rate limits, or security features;

(e) **Malicious Code.** Upload, transmit, distribute, or deploy viruses,
malware, ransomware, spyware, adware, trojan horses, keyloggers, worms,
rootkits, logic bombs, cryptomining code, or any other malicious or harmful
code, software, or content;

(f) **Network Attacks.** Conduct or facilitate distributed denial-of-service
(DDoS) attacks, denial-of-service (DoS) attacks, packet flooding, amplification
attacks, or any activity that materially disrupts, degrades, overloads, or
impairs the availability, integrity, or performance of the Services, the
Platform, or any networks or infrastructure connected to or supporting them;

(g) **Unauthorized Security Testing.** Conduct penetration testing, security
scanning, fuzzing, fuzz testing, or vulnerability research against the
Operator's hosted infrastructure, APIs, production Frontend Application, or live
Smart Contract deployments without the Operator's prior express written
authorization. Testing of the publicly available open-source Smart Contract code
on public test networks is permitted in accordance with the Apache License,
Version 2.0;

(h) **Reverse Engineering.** Decompile, disassemble, reverse engineer, or
attempt to derive source code or underlying algorithms of any hosted proprietary
component of the Services (excluding components already available under
Apache-2.0 or other open-source licenses), except to the limited extent
expressly permitted by applicable law notwithstanding this restriction;

(i) **Automated Abuse.** Use automated bots, scripts, crawlers, spiders,
scrapers, or other automated means to access the Services in a manner that
excessively burdens, disrupts, harvests data from, or otherwise abuses the
Platform without prior written authorization;

(j) **Spam.** Send unsolicited communications, spam, chain letters, phishing
emails, fraudulent communications, or other bulk or commercial messaging through
or in connection with the Services;

(k) **Harassment and Harm.** Harass, threaten, intimidate, stalk, defame, abuse,
doxx, or otherwise harm any individual, group, or organization;

(l) **Intellectual Property Infringement.** Upload, transmit, or otherwise make
available any Content that infringes or misappropriates any third party's
copyright, trademark, patent, trade secret, or other intellectual property or
proprietary right;

(m) **Illegal Financial Activity.** Engage in money laundering, terrorist
financing, sanctions evasion, securities fraud, market manipulation,
unauthorized money transmission, or any other illegal financial activity,
including the use of the Platform to move or conceal proceeds of crime, to evade
taxes, or to circumvent applicable financial regulations;

(n) **Smart Contract Exploitation.** Exploit, manipulate, front-run, sandwich
attack, or otherwise abuse the Smart Contracts or blockchain mechanics in ways
that cause unintended harm to other Users, including without limitation
exploiting reentrancy vulnerabilities, oracle manipulation, juror selection
manipulation, flash loan attacks, or unauthorized extraction of funds;

(o) **Malicious Derivatives.** Distribute modified versions of the TrustLedger
software, or deploy derivatives of the Smart Contracts, in a manner designed or
intended to deceive, defraud, harm, or misappropriate funds from Users or third
parties, regardless of whether such actions are technically permitted by the
Apache License with respect to the Licensed Code;

(p) **Harmful Impersonation.** Create, deploy, or operate counterfeit or
deceptive versions of the Platform, the Smart Contracts, or the Frontend
Application that mislead Users into believing they are interacting with the
official TrustLedger Platform or endorsed TrustLedger services;

(q) **Sanctions Violations.** Use the Services to provide funds, resources,
economic benefit, or other support to any individual or entity subject to
applicable sanctions laws or executive orders;

(r) **Export Violations.** Use the Services in violation of export control laws
or regulations, including without limitation the Export Administration
Regulations (EAR) and International Traffic in Arms Regulations (ITAR), or cause
the Operator to be in violation of such laws;

(s) **Child Safety.** Upload, transmit, generate, or make available any content
involving the sexual exploitation or abuse of minors, or that otherwise violates
laws designed to protect children;

(t) **Data Harvesting.** Collect, harvest, scrape, mine, or compile personally
identifiable information, wallet addresses, or other data about other Users
without their consent and without the Operator's authorization;

(u) **Evidence Fabrication.** Submit fabricated, falsified, or fraudulent
evidence within the arbitration system, including false proof-of-work
submissions, counterfeit document hashes, or misrepresented completion claims;

(v) **Juror Collusion.** Coordinate with other jurors, parties, or third parties
to manipulate or predetermine the outcome of any arbitration dispute or voting
process;

(w) **System Interference.** Interfere with or disrupt the integrity or
performance of the Smart Contracts, blockchain Transactions, IPFS content
addressing, oracle data feeds, cron jobs, or any other infrastructure component
of the Services;

(x) **Defamatory or Harmful Content.** Publish, submit, or distribute Content
that is defamatory, discriminatory, hateful, violent, obscene, or otherwise
unlawful;

(y) **Circumvention of Fees or Controls.** Circumvent, evade, or attempt to
bypass any fee structures, rate limits, access controls, or platform governance
mechanisms; or

(z) **Any Other Harmful Use.** Use the Services in any manner that the Operator
reasonably determines is harmful, abusive, offensive, objectionable, or
inconsistent with the purpose of the Platform or the rights of other Users.

**4.3 Operator's Right to Investigate and Enforce.** The Operator reserves the
right, but not the obligation, to investigate suspected violations of these
Terms or applicable law. The Operator may: (a) report activity reasonably
believed to violate applicable law to appropriate law enforcement authorities;
(b) cooperate with law enforcement investigations; (c) produce records in
response to lawful legal process; and (d) take any technical, legal, or
operational measure it deems necessary to protect the Services, Users, or third
parties from harm.

**4.4 No Monitoring Obligation.** The Operator has no obligation to monitor User
Content, User activity, or Smart Contract usage for compliance with these Terms.
The absence of monitoring does not constitute endorsement or approval of any
activity. Users are solely responsible for their own compliance.

---

## 5. Intellectual Property

**5.1 Platform Ownership.** The TrustLedger Platform, including the Frontend
Application, Smart Contracts, documentation, design systems, visual identity,
Marks, brand assets, user interface elements, marketing materials, trade
secrets, proprietary algorithms, and all other protectable elements that are not
governed by the Apache License, Version 2.0, are and shall remain the exclusive
property of the Operator and its licensors. All rights not expressly granted are
reserved.

**5.2 Open-Source Code.** The source code of the TrustLedger software repository
is made available under the Apache License, Version 2.0 ("Apache License").
Nothing in these Terms restricts any right You have under the Apache License to
use, copy, modify, distribute, or deploy the Licensed Code in accordance with
that license. See Section 6 for a full description of the relationship between
the Apache License and these Terms.

**5.3 Trademark and Branding.** The Marks are the property of the Operator. No
right, title, or interest in or to the Marks is granted by these Terms or by the
Apache License. You may not:

(a) use the Marks in any manner that implies endorsement, sponsorship, or
affiliation with the Operator without express prior written permission;

(b) use the Marks in connection with products, services, or activities that are
not the official TrustLedger Platform;

(c) register or attempt to register any domain name, social media handle,
username, app store listing, NFT, ENS name, or other identifier that
incorporates the Marks or any confusingly similar variation thereof;

(d) modify, distort, adapt, animate, or create derivative versions of the Marks;

(e) use the Marks as part of a logo, slogan, or other brand identifier for Your
own business or project without express prior written permission;

(f) use the Marks in any manner likely to cause confusion, mistake, or deception
as to the source, origin, sponsorship, or affiliation of any product, service,
or project; or

(g) use the Marks in any manner that tarnishes, dilutes, or otherwise harms the
reputation or goodwill of the Operator.

**5.4 Copyright.** All original creative expression in the Platform not governed
by the Apache License is protected by applicable copyright law. You may not
reproduce, republish, distribute, publicly display, publicly perform, broadcast,
create derivative works of, or otherwise exploit any such copyrighted material
without the prior written consent of the Operator.

**5.5 Documentation.** All documentation, guides, tutorials, runbooks,
architecture diagrams, explanatory materials, and educational content published
in connection with the Platform are subject to the intellectual property
protections described in this Section. Technical documentation that is part of
the Licensed Code in the repository is subject to the Apache License with
respect to reproduction and distribution, and to this Section with respect to
trademark, branding, and platform-service use.

**5.6 Design and Visual Assets.** The Platform's visual design, user interface
layouts, color schemes, typography, iconography, design tokens, and overall
visual identity are original creative works owned by the Operator and are not
governed by the Apache License unless explicitly included in the repository with
an Apache-2.0 license notice.

**5.7 Third-Party Intellectual Property.** The Platform incorporates third-party
software, libraries, APIs, fonts, icons, and other materials subject to their
own licenses, including but not limited to MIT, ISC, BSD, and other open-source
licenses. Your use of such third-party materials is subject to those licenses.
Dependency manifests in the repository identify applicable third-party
components.

**5.8 Copyright Notice Preservation.** Where You reproduce or distribute source
code, compiled binaries, or documentation derived from the TrustLedger
repository, You must preserve all applicable copyright notices, attribution
notices, patent notices, trademark notices, license notices, and NOTICE file
contents as required by the Apache License, Version 2.0, Section 4.

**5.9 No Implied Licenses.** Except as expressly stated in these Terms or in the
Apache License, no license or other right is granted to You, by implication,
estoppel, or otherwise, with respect to any intellectual property rights of the
Operator or its licensors.

**5.10 Patent Assertion.** You agree that You will not initiate or participate
in any claim, proceeding, or action asserting that any portion of the Platform,
the Licensed Code, or any Released Party's products or services infringe any
patent claim that You own or control, unless You first provide thirty (30) days'
written notice to the Operator. Initiating patent litigation against the
Operator or any Released Party automatically and immediately terminates any
patent license granted to You under the Apache License.

---

## 6. Relationship Between Apache-2.0 and These Terms

**6.1 Dual Governance Framework.** The TrustLedger repository is made available
under two overlapping governance frameworks that serve distinct, complementary
purposes:

(a) **The Apache License, Version 2.0**, governs Your rights to use, reproduce,
modify, prepare derivative works of, publicly display, publicly perform,
sublicense, and distribute the Licensed Code and associated documentation files
contained in the TrustLedger repository.

(b) **These Terms and Conditions** govern Your use of the TrustLedger Platform
as a hosted online service — including the hosted Frontend Application, deployed
Smart Contracts, API endpoints, backend services, email notification services,
oracle integrations, storage infrastructure, and all related service features —
regardless of whether You have separately obtained a copy of the Licensed Code.

**6.2 No Conflict; Apache-2.0 Controls Where Applicable.** These Terms are
designed to be fully consistent with and complementary to the Apache License.
These Terms do not revoke, restrict, or modify any rights that the Apache
License grants to You with respect to the Licensed Code. To the extent any
provision of these Terms could be construed to conflict with the Apache License
with respect to rights expressly granted by the Apache License to use, copy,
modify, or distribute the Licensed Code, the Apache License controls for that
specific right.

**6.3 Scope of the Apache License.** The Apache License grants You a perpetual,
worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license
to reproduce, prepare derivative works of, publicly display, publicly perform,
sublicense, and distribute the Licensed Code and derivative works You create
from it, subject to the conditions specified in the Apache License, including
the attribution and notice conditions in Section 4 of the Apache License. The
Apache License further grants a patent license from each Contributor as
specified therein.

**6.4 Scope of These Terms.** These Terms govern Your interactive use of the
Services as a hosted platform. Your use of the Services — including connecting
Your Wallet, submitting Transactions, uploading Content, participating in the
arbitration system, receiving email notifications, and accessing APIs — is
governed by these Terms. The Apache License does not govern the terms on which
You use the hosted Platform as a service.

**6.5 Attribution and Notice Requirements.** Where You distribute the Licensed
Code or works derived therefrom, You must comply with all attribution and notice
requirements of the Apache License, including:

(a) retaining all copyright notices in the Licensed Code or any derivative work;

(b) retaining all patent notices;

(c) retaining all trademark notices;

(d) providing a copy of the Apache License with any distribution of the Licensed
Code or derivative works;

(e) retaining all contents of any NOTICE file present in the repository; and

(f) clearly marking any files You modify as having been changed, including the
date of modification.

**6.6 Trademark Rights Reserved.** The Apache License explicitly states in
Section 6 that it does not grant permission to use the trade names, trademarks,
service marks, or product names of the Licensor, except as required for
reasonable and customary use in describing the origin of the Licensed Code and
reproducing the content of the NOTICE file. Accordingly, the Apache License does
not authorize the use of the Marks as described in Section 5.3 of these Terms.
All trademark rights are expressly reserved to the Operator.

**6.7 Patent License.** The Apache License grants You a patent license from each
Contributor to make, use, sell, offer for sale, import, and otherwise transfer
the Licensed Code. This patent grant is subject to automatic termination if You
initiate patent litigation against any Released Party alleging that the Licensed
Code infringes a patent.

**6.8 Intellectual Property Outside the Licensed Code.** Intellectual property
in the Platform that is not part of the Licensed Code — including but not
limited to proprietary service-side logic, configuration, infrastructure, design
assets, brand identity, operator-specific business logic not published in the
repository, and trade secrets — is not subject to the Apache License and is
governed solely by these Terms.

**6.9 User Obligations Under the Apache License.** If You reproduce, modify,
sublicense, or distribute the Licensed Code, You are independently bound by the
obligations of the Apache License in addition to the obligations set forth in
these Terms. The Operator makes no representation regarding Your compliance with
the Apache License and assumes no obligation to enforce Apache License
compliance on Your behalf.

**6.10 Hosted Service vs. Source Distribution.** These Terms apply to Your use
of the hosted Services regardless of whether You have also obtained a copy of
the Licensed Code. A developer who has forked the repository and is running
their own independent deployment is using the Licensed Code (governed by the
Apache License), not the Operator's hosted Services (governed by these Terms).
Both frameworks apply concurrently to a developer who uses both.

---

## 7. User Content and Submissions

**7.1 Ownership of User Content.** As between You and the Operator, You retain
ownership of User Content that You submit to the Services, subject to the
license grant in Section 7.2 and the limitations described in this Section.

**7.2 License Grant to Operator.** By submitting User Content to the Services,
You grant the Operator and its affiliates a worldwide, non-exclusive,
royalty-free, sublicensable, and transferable license to use, process, transmit,
store, display, operate, and reproduce that User Content solely to the extent
necessary to: (a) provide and maintain the Services; (b) comply with applicable
law and legal process; and (c) enforce these Terms. This license is perpetual
only to the extent the User Content has been recorded on a blockchain, which is
immutable and cannot be removed.

**7.3 Immutability of On-Chain Content.** You acknowledge and accept that any
Content submitted to a blockchain or to a decentralized storage system such as
IPFS is permanent, immutable, and publicly accessible to anyone, and cannot be
deleted, modified, altered, or retracted by the Operator, by You, or by any
other party. Before submitting any Content on-chain or to IPFS, You must satisfy
Yourself that: (a) You are authorized to make such a submission; (b) the
submission does not infringe any third party's rights; (c) the submission does
not contain private, confidential, or sensitive information that You do not wish
to be permanently and publicly accessible; and (d) the submission complies with
applicable law.

**7.4 Content Representations and Warranties.** You represent and warrant that:
(a) You own or have obtained all rights, licenses, consents, and permissions
necessary to submit Your User Content and to grant the license in Section 7.2;
(b) Your User Content does not infringe or violate the intellectual property
rights, privacy rights, personality rights, moral rights, or other rights of any
third party; (c) Your User Content is accurate, truthful, and not fraudulent,
misleading, or fabricated; (d) Your User Content complies with these Terms and
all applicable laws; and (e) the submission of Your User Content will not cause
harm to any person or entity.

**7.5 Content Removal.** The Operator reserves the right, but not the
obligation, to remove, refuse, moderate, or disable access to any User Content
in the Frontend Application at its sole discretion, with or without notice, for
any reason, including without limitation upon receipt of a valid DMCA takedown
notice, upon reasonable belief that the Content violates these Terms or
applicable law, or in response to a lawful order from a governmental or judicial
authority. Removal of Content from the Frontend Application does not and cannot
affect immutable records on blockchains or permanently pinned content on
decentralized storage networks.

**7.6 No Confidentiality.** You should not submit Content to the Services that
You wish to keep confidential. The Operator does not treat User Content
submitted through the Services as confidential information unless separately
agreed in writing. User Content may be visible to other Users, operators, or the
public depending on the feature used. On-chain content is permanently public.

**7.7 User Content and Counterparty Disputes.** Any dispute between You and a
Counterparty regarding User Content — including disputes regarding contract
documents, proof of work, evidence, or ratings — is solely between You and that
Counterparty. The Operator has no obligation to adjudicate, mediate, or resolve
any such dispute.

---

## 8. Feedback and Enhancement Requests

**8.1 Voluntary Feedback.** If You provide Feedback to the Operator, You grant
the Operator a perpetual, irrevocable, worldwide, royalty-free, fully paid-up,
sublicensable, and transferable license to use, reproduce, modify, adapt,
publish, translate, distribute, and create derivative works from that Feedback
without restriction and without any obligation of confidentiality, attribution,
or compensation of any kind.

**8.2 No Obligation.** The Operator is under no obligation to review, accept,
implement, or respond to any Feedback. No submission of Feedback creates any
contractual obligation on the part of the Operator.

**8.3 No Rights Reserved.** You acknowledge that the Operator may have received
or may in the future receive and independently develop features, improvements,
or functionality similar to Your Feedback. By submitting Feedback, You waive any
claim that such independent development constitutes infringement of, or was
derived from, Your Feedback.

**8.4 Feedback Is Not Confidential.** Feedback is not treated as confidential.
Do not submit Feedback that contains trade secrets, confidential information, or
information that is subject to third-party confidentiality obligations.

---

## 9. Blockchain, Smart Contracts, and Cryptocurrency

**9.1 Inherent Blockchain Risks.** You acknowledge that blockchain technology,
smart contracts, and cryptocurrency transactions involve significant,
potentially irreversible, and not fully quantifiable risks, including without
limitation:

(a) **Immutability.** Transactions recorded on a blockchain are permanent,
irreversible, and cannot be modified, reversed, or deleted by the Operator under
any circumstances. Once a Transaction is broadcast and confirmed on a
blockchain, the Operator has no ability to reverse, recover, modify, or cancel
it.

(b) **Private Key Risk.** Loss of access to, or compromise of, a Wallet's
private key or seed phrase results in permanent, irrecoverable loss of all
assets controlled by that Wallet. The Operator cannot recover lost keys, cannot
restore access to Wallets, and is not responsible for losses arising from key
loss or compromise.

(c) **Unaudited Smart Contracts.** Smart contracts are software programs and may
contain bugs, vulnerabilities, logical errors, mathematical errors, or other
defects that could result in unexpected behavior, loss of funds, incorrect
rulings, unauthorized state transitions, or total loss of deposited assets.
**THE SMART CONTRACTS DEPLOYED IN CONNECTION WITH THE PLATFORM HAVE NOT BEEN
INDEPENDENTLY AUDITED AS OF THE EFFECTIVE DATE OF THESE TERMS, AND NO
INDEPENDENT AUDIT REPORT IS AVAILABLE. YOU SHOULD NOT USE THE SMART CONTRACTS
FOR THE CUSTODY OF SIGNIFICANT FUNDS UNTIL AN INDEPENDENT SECURITY AUDIT HAS
BEEN COMPLETED AND PUBLISHED. USE IS AT YOUR SOLE RISK.**

(d) **Network Congestion and Gas Fees.** Blockchain Transactions require payment
of network fees (gas fees) that fluctuate with network demand and cannot be
predicted or controlled by the Operator. Transactions may be delayed, dropped
from the mempool, or fail entirely if insufficient fees are provided or if the
network experiences congestion.

(e) **Fork and Protocol Risk.** The blockchain networks on which the Smart
Contracts operate may undergo hard forks, soft forks, protocol upgrades, chain
reorganizations, or other changes that could affect the behavior of, or access
to, the Smart Contracts and the Services, potentially rendering deployed
contracts inaccessible, inoperable, or behaving in unintended ways.

(f) **Regulatory Risk.** Laws and regulations regarding blockchain technology,
cryptocurrency, digital assets, decentralized finance, smart contracts, and
related activities are evolving rapidly across all jurisdictions. Regulatory
changes may affect the legality, availability, or operation of the Services,
require modifications to the Platform, or require Users to comply with new
obligations.

(g) **Cryptocurrency Volatility.** Cryptocurrency values are highly volatile and
may decline significantly or become worthless. The Operator makes no
representation regarding the current or future value of any cryptocurrency held
in, transferred through, or associated with the Services. Escrowed funds are
denominated in cryptocurrency and are therefore subject to market risk.

(h) **Pseudorandomness in Juror Selection.** Where the Arbitration Smart
Contract uses non-VRF juror selection based on `block.prevrandao`,
`block.timestamp`, and a dispute identifier, such selection is pseudo-random and
may be subject to influence by block producers or validators. This method of
selection does not provide the same guarantees as cryptographically secure
randomness from a trusted external oracle (VRF).

(i) **ERC-20 Token Compatibility Risk.** Fee-on-transfer tokens, rebasing
tokens, pausable tokens, upgradeable tokens, tokens with governance controls,
and tokens with non-standard transfer behavior may behave unexpectedly within
the escrow system. The Operator does not guarantee that all ERC-20 tokens added
to the allowlist will function as intended within the Escrow Contract.

(j) **Bridge and Cross-Chain Risk.** If You use blockchain bridges or
cross-chain protocols in connection with the Services, You assume all risks
associated with bridge technology, including smart contract exploits, validator
collusion, and loss of bridged assets.

(k) **Miner/Validator Extractable Value (MEV).** Transactions submitted to
public blockchain networks are subject to reordering, front-running, and
sandwich attacks by block producers. The Operator makes no guarantee that
Transactions will be executed in the order intended or at the price expected.

(l) **Oracle Manipulation.** On-chain oracles used for juror selection or other
Platform functions may be subject to manipulation. The Operator does not
guarantee oracle integrity.

**9.2 No Financial Advice.** Nothing in the Services constitutes financial,
investment, tax, or legal advice regarding cryptocurrency, blockchain
technology, digital assets, or any specific Transaction. You assume sole and
complete responsibility for all decisions to engage in blockchain Transactions.

**9.3 Transaction Finality.** You understand that when You execute a Transaction
through the Services — including funding an escrow, releasing funds, casting a
juror vote, submitting evidence, staking, or any other on-chain action — that
Transaction is submitted irrevocably to the relevant blockchain network. The
Operator is not responsible for Transactions that fail, are reverted by the
network, are front-run, are dropped from the mempool, result in more gas than
estimated, or otherwise do not complete as expected.

**9.4 Gas and Transaction Costs.** All gas fees and other network costs
associated with blockchain Transactions are Your sole responsibility. The
Operator is not responsible for any losses arising from fluctuating gas fees,
failed Transactions, gas estimation errors, or transaction cost estimates that
prove inaccurate.

**9.5 Network Support.** The Services currently support certain specified
networks including Ethereum Sepolia (testnet), Arbitrum One, Base, and Optimism.
The Operator reserves the right to add, modify, or remove supported networks at
any time without notice. Removal of support for a network may render previously
deployed Smart Contracts inaccessible through the Frontend Application.

**9.6 Testnet Disclaimer.** Certain features of the Platform are designed for
testnet environments. Testnet tokens have no monetary value. The Operator makes
no guarantee that testnet behavior will replicate mainnet behavior. Testnet
deployments may be reset, paused, or discontinued at any time.

---

## 10. Escrow and Contract Workflow

**10.1 Technology Provider Only.** The Platform provides technology tools that
enable Users to create, negotiate, fund, and manage escrow arrangements between
themselves. The Operator is solely a technology provider and is not a party to
any escrow arrangement, freelance agreement, service agreement, or other
contract created through the Services. The Operator does not hold, control,
manage, or have discretion over escrow funds at any time; all funds are held in
and controlled exclusively by the Escrow Contract on the applicable blockchain.

**10.2 Not an Escrow Agent.** The Operator does not believe it operates as a
licensed escrow agent, money transmitter, trust company, or financial
institution. The Platform does not intentionally provide regulated escrow
services. The Smart Contract code performs automated on-chain custody according
to its programmed logic; this is a technological function, not an intentionally
regulated financial or trust service. However, the Operator makes no legal
representation that regulatory authorities in any jurisdiction will agree with
this characterization. You are solely responsible for determining whether Your
use of the Platform's escrow features implicates any licensing, registration, or
regulatory obligation applicable to You. If You use the Platform's escrow
features in a capacity that may constitute regulated financial services in Your
jurisdiction, You are solely responsible for obtaining all required licenses or
approvals.

**10.3 No Guarantee of Performance.** The Operator makes no representation,
warranty, or guarantee that: (a) any freelancer will perform services as
promised or to any particular standard; (b) any client will fund or release
payments as agreed or on time; (c) any escrow arrangement will be legally
enforceable under applicable law; (d) proof of work submitted by a freelancer is
accurate, complete, or satisfactory; (e) any dispute outcome will reflect the
actual merits of the underlying disagreement; or (f) any User has the financial
ability to fulfill their obligations under any agreement.

**10.4 User Responsibility for Due Diligence.** You are solely and exclusively
responsible for: (a) evaluating the trustworthiness, qualifications, reputation,
and suitability of any Counterparty before entering into any agreement; (b)
independently verifying all representations made by any Counterparty; (c)
understanding the full terms of any contract You propose, accept, fund, or
execute; (d) verifying that Your Wallet is connected to the correct blockchain
network before submitting any Transaction; (e) reviewing and fully understanding
all Transaction parameters before confirming any Transaction; and (f) obtaining
independent legal advice before entering into any legally significant agreement.

**10.5 Contract Lifecycle Risks.** You acknowledge the following risks:

(a) **Deadline and Timing.** Contract deadlines are enforced by the Escrow
Contract based on block timestamps, which may not correspond precisely to
calendar time. Block production times vary. The Operator makes no guarantee that
deadline enforcement will occur at the exact intended calendar time.

(b) **Warranty Hold.** The holdback mechanism retains a portion of funds in the
Escrow Contract for the warranty period. The Operator is not responsible for any
loss of holdback funds due to smart contract defects, network issues, blockchain
forks, or any other technical or non-technical cause.

(c) **Cancellation and Rejection.** Proposals may be cancelled or rejected by
either party in accordance with the applicable contract flow. Once cancelled,
the Operator cannot restore a cancelled escrow, and any fees paid in connection
with that escrow may not be recoverable.

(d) **Acceptance Window.** If a client fails to approve or dispute submitted
proof of work within the acceptance window, the Escrow Contract may allow the
freelancer to claim funds without client approval. You are responsible for
understanding and acting within all applicable time windows.

(e) **Contract Document Authenticity.** Contract hashes stored on-chain
reference off-chain documents. The Operator cannot verify that a contract
document referenced by a hash accurately reflects the parties' mutual
understanding, is legally valid, or has not been falsified.

---

## 11. Arbitration and Dispute Resolution Features

**11.1 Platform Arbitration System — Technology Only.** The Platform includes a
smart contract-based dispute resolution system that uses selected jurors to
adjudicate escrow disputes based on submitted evidence and commit-reveal voting.
This system is a technical feature of the Platform. It does not constitute a
formal legal arbitration proceeding, binding legal adjudication, judicial
process, or alternative dispute resolution mechanism recognized under applicable
law, unless the parties to a specific dispute have separately agreed in writing
to treat the outcome as legally binding. The Operator makes no representation
that outcomes produced by the Platform's dispute resolution system are legally
enforceable in any jurisdiction.

**11.2 Juror Participation — Voluntary.** Jurors who participate in the
Platform's dispute resolution system do so voluntarily. Juror eligibility, stake
requirements, voting procedures, reward mechanisms, slashing conditions, and
cooldown periods are governed solely by the JurorRegistry Contract and
Arbitration Smart Contract code. The Operator does not guarantee: (a) that
sufficient eligible jurors will be available for any particular dispute; (b)
that any juror has the knowledge, expertise, or impartiality to render a fair
determination; (c) that jurors will not collude; or (d) that the juror system
will function as intended in all circumstances.

**11.3 Juror Selection — Pseudorandomness Caveat.** Where VRF randomness is not
configured, juror selection relies on pseudo-random derivation from blockchain
parameters as described in Section 9.1(h). You acknowledge that this method of
selection carries inherent limitations and that committee composition may be
influenced by block producers.

**11.4 Commit-Reveal Voting — User Responsibility.** Jurors must submit vote
commitments and reveal them within applicable time windows. Jurors who fail to
reveal their votes may be subject to slashing of their staked funds. The
Operator is not responsible for any losses incurred by a juror who fails to
complete the reveal phase due to technical failure, user error, network
congestion, or any other cause. Juror participation carries financial risk.

**11.5 Evidence — No Verification.** Evidence submitted by parties is stored as
metadata in the Arbitration Smart Contract and/or on IPFS. The Operator makes no
representation that evidence records are accurate, complete, authentic, legally
sufficient, or unmanipulated. Each party is solely responsible for the accuracy,
completeness, and legality of evidence submitted under their Wallet address.

**11.6 No Substitute for Legal Process.** The Platform's dispute resolution
system is not a substitute for legal arbitration, mediation, or court
proceedings. If You require legally binding dispute resolution, You must engage
qualified legal professionals and use appropriate legal processes independent of
the Platform. Nothing in the Platform's arbitration system creates any
precedent, legal right, or enforceable obligation outside of what the Smart
Contract code autonomously executes.

**11.7 Appeals — Smart Contract Only.** The appeal mechanism is a technical
feature of the Arbitration Smart Contract. Appeals create a second dispute with
a larger committee and require an appeal bond. The Operator is not a party to or
arbiter of any appeal. All appeal outcomes are determined by the on-chain logic
of the Arbitration Smart Contract.

---

## 12. Reputation System

**12.1 Ratings Are Immutable.** The ReputationRegistry Contract stores numeric
ratings submitted by escrow parties upon conclusion of a contract. Ratings are
permanently and immutably recorded on-chain once submitted. The Operator cannot
reverse, modify, remove, or suppress any on-chain rating. You must be certain of
a rating before submitting it.

**12.2 No Guarantee of Accuracy.** On-chain reputation scores may not accurately
reflect a User's actual performance, qualifications, honesty, or character. You
should not rely solely on platform reputation scores when evaluating
Counterparties. Ratings may reflect personal disputes, subjective judgments, or
bad-faith submissions.

**12.3 Rating Recovery.** The Platform includes a reputation recovery mechanism.
The Operator makes no guarantee that recovery pathways will be available,
effective, result in any particular outcome, or be maintained in their current
form.

**12.4 False Ratings Prohibited.** You agree not to submit ratings that are
knowingly false, fabricated, retaliatory, or submitted for the purpose of
harming another User's reputation or competitive standing. Submission of false
ratings may constitute defamation under applicable law and a violation of these
Terms, and may subject You to legal liability and termination of Your access.

**12.5 No Reliance on Reputation for High-Stakes Decisions.** You acknowledge
that a User's reputation score on the Platform does not constitute a
verification of identity, criminal record, professional licensing, financial
solvency, or good faith. You must conduct independent due diligence for any
high-value or high-risk transaction.

---

## 13. Marketplace and Collaboration Disclaimers

**13.1 Technology Provider Status.** TrustLedger is solely and exclusively a
technology provider. The Operator is not a freelance marketplace, labor agency,
employment agency, staffing firm, financial institution, regulated escrow
service provider, arbitration provider, licensed dispute resolution provider,
payment processor, or party to any agreement between Users.

**13.2 No Verification of Identity or Credentials.** The Operator does not
verify the true identity, credentials, qualifications, professional licensure,
immigration status, criminal history, financial standing, or legal standing of
any User. Wallet addresses associated with the Services are pseudonymous and may
or may not correspond to the person or entity You believe controls them. You
assume all risk in transacting with Counterparties whose identities are
unverified.

**13.3 No Guarantee of Legal Enforceability.** Contract hashes and contract URIs
stored in the Escrow Contract represent User-provided metadata pointing to
off-chain agreement documents. The Operator does not review, validate, notarize,
or guarantee the legal enforceability, completeness, accuracy, or validity of
any underlying agreement. The Platform's recording of a contract hash on-chain
does not create, validate, witness, or legally evidence a binding contract
between parties. Users should obtain independent legal counsel to ensure their
agreements are legally enforceable.

**13.4 No Responsibility for User Disputes.** The Operator is not a party to,
and has no responsibility for, any dispute arising between Users in connection
with a freelance agreement, escrow arrangement, arbitration proceeding, rating,
or any other interaction. Users are solely responsible for resolving their own
disputes, whether through the Platform's technical features or through
appropriate legal channels. The Operator has no obligation to intervene in any
User dispute.

**13.5 No Escrow Custody.** All funds deposited into the Escrow Contract are
controlled exclusively by the Smart Contract's on-chain logic. The Operator does
not hold, control, manage, or have any discretion over such funds at any time.
Loss of funds due to smart contract defects, bugs, exploits, user error,
blockchain forks, reentrancy attacks, or any other cause is not the Operator's
responsibility.

**13.6 No Background Checks.** The Platform does not perform background checks,
criminal record checks, identity verification, professional license
verification, credit checks, or any other vetting of Users. You must perform
Your own due diligence.

---

## 14. Financial Platform Protections

**14.1 Not a Financial Institution.** The Operator is not a bank, credit union,
savings institution, broker-dealer, investment adviser, registered investment
company, money transmitter, payment processor, financial intermediary, insurance
company, or any other form of regulated financial institution. The Services do
not constitute regulated financial services in any jurisdiction.

**14.2 Not a Payment Guarantor.** The Operator does not guarantee, insure, back,
underwrite, or otherwise assume financial responsibility for any payment,
transaction, escrow outcome, or financial obligation between Users. The Operator
has no obligation to cover losses arising from failed transactions, counterparty
default, fraud, or any other financial loss.

**14.3 Not a Lender or Creditor.** The Operator does not extend credit, provide
loans, advance funds, or act as a creditor or lender in connection with the
Services.

**14.4 Not a Fiduciary.** Nothing in the Platform creates a fiduciary duty,
trustee relationship, or other heightened duty of care on the part of the
Operator with respect to Users or their funds.

**14.5 Users Assume All Financial Risk.** You are solely and exclusively
responsible for:

(a) all financial decisions made in connection with the Services;

(b) all risks associated with depositing, holding, or transferring
cryptocurrency;

(c) all risks associated with entering into freelance agreements, escrow
arrangements, or other contracts through the Platform;

(d) all tax obligations arising from your use of the Services, including but not
limited to capital gains tax, income tax, value-added tax, and any other
applicable tax or reporting obligation;

(e) all counterparty risk associated with transacting with other Users;

(f) all risks associated with cryptocurrency price volatility;

(g) all risks associated with smart contract bugs, defects, or exploits; and

(h) all financial losses arising from fraud, scams, misrepresentation, or
counterparty misconduct.

**14.6 No Guarantee of Payments or Collections.** The Operator does not
guarantee that any payment will be made, that any escrow will be funded, that
any juror fee will be collected, or that any financial outcome will be achieved.
The Platform is a technology tool that automates contract mechanics; it does not
guarantee financial outcomes.

**14.7 No Guarantee of Commercial Success.** The Operator does not guarantee
that use of the Platform will result in commercial success, profitability, new
business relationships, satisfied clients, paid invoices, or any other business
outcome.

**14.8 User Tax Obligations.** Users are solely responsible for determining and
fulfilling all tax obligations arising from their use of the Platform, including
without limitation reporting cryptocurrency income, capital gains,
self-employment income, and any other taxable events. The Platform does not
provide tax forms, tax advice, or tax reporting to any governmental authority on
behalf of Users.

---

## 15. No Fiduciary Relationship

**15.1 No Fiduciary Duty.** The relationship between You and the Operator is
that of independent parties bound only by these Terms. Nothing in these Terms,
the Platform, or any communication between You and the Operator creates,
implies, or establishes any of the following relationships between You and the
Operator:

(a) a fiduciary relationship of any kind;

(b) a trustee-beneficiary relationship;

(c) an agency relationship;

(d) a partnership or joint venture;

(e) an employer-employee relationship;

(f) a principal-agent relationship;

(g) a brokerage relationship;

(h) an investment advisory relationship;

(i) an attorney-client relationship;

(j) a financial adviser-client relationship; or

(k) any other relationship that would impose a heightened duty of care, loyalty,
confidentiality, or disclosure on the Operator beyond what is expressly stated
in these Terms.

**15.2 No Special Duty.** The Operator owes You no special duty beyond what is
expressly stated in these Terms. The Operator acts solely in its own interests
in operating the Platform and is not required to act in Your interests or the
interests of any other User.

**15.3 No Authority to Act.** You have no authority to act on behalf of the
Operator, to bind the Operator in any contract, to make representations on the
Operator's behalf, or to create any obligation for the Operator with respect to
any third party.

---

## 16. Anti-Fraud, Anti-Scam, and Due Diligence Obligations

**16.1 Fraud Risk Acknowledgment.** You acknowledge that internet-connected
platforms, including the TrustLedger Platform, may attract bad actors, scammers,
fraudsters, phishing campaigns, social engineering attempts, impersonators, and
other malicious actors. You agree to exercise caution, independent judgment, and
due diligence in all interactions through the Platform. **THE OPERATOR CANNOT
AND DOES NOT GUARANTEE THAT ALL USERS OF THE PLATFORM ARE ACTING IN GOOD
FAITH.**

**16.2 Due Diligence Obligation.** You are solely and entirely responsible for
conducting Your own due diligence before: (a) entering into any agreement or
contract through the Platform; (b) depositing funds into any escrow; (c)
releasing funds from any escrow; (d) engaging a freelancer or client; (e)
participating as a juror in any dispute; (f) sharing any personal, financial, or
sensitive information with any Counterparty; or (g) taking any other action in
reliance on information provided by or about any Counterparty.

**16.3 No Verification of Counterparties.** The Operator does not and cannot
verify the identity, legitimacy, intentions, credentials, qualifications,
financial stability, good faith, honesty, or capability of any User. The
following are expressly not guaranteed by the Operator:

(a) that any User is who they claim to be;

(b) that any User's qualifications or experience are authentic;

(c) that any User intends to perform their contractual obligations;

(d) that any User is financially solvent or able to pay;

(e) that any User is not operating a scam, fraud, or deceptive scheme;

(f) that any User's communications are truthful or accurate;

(g) that any User's submitted documents are genuine or unaltered; or

(h) that any User has not previously engaged in fraudulent or dishonest
behavior.

**16.4 Operator Liability Not Available for Fraud Losses.** THE OPERATOR SHALL
NOT BE LIABLE FOR ANY LOSSES, DAMAGES, COSTS, OR HARMS ARISING FROM FRAUD,
SCAMS, MISREPRESENTATION, IDENTITY THEFT, IMPERSONATION, PHISHING, SOCIAL
ENGINEERING, UNAUTHORIZED TRANSACTIONS, UNAUTHORIZED ESCROW PROPOSALS, PAYMENT
REDIRECTION, ACCOUNT COMPROMISE, OR ANY OTHER DECEPTIVE OR FRAUDULENT ACT BY ANY
USER OR THIRD PARTY. YOUR SOLE RECOURSE FOR FRAUD-RELATED LOSSES IS AGAINST THE
RESPONSIBLE PARTY, NOT THE OPERATOR.

**16.5 Common Fraud Schemes.** Without limiting Section 16.4, You should be
aware that the following types of fraud and scam activity have been known to
target freelance and blockchain platforms and are among the risks You assume:

(a) advance-fee fraud, in which a bad actor requests payment or cryptocurrency
transfers before delivering promised services, goods, or opportunities;

(b) impersonation fraud, in which a bad actor poses as a legitimate User,
Counterparty, or platform representative to gain trust or obtain payments;

(c) phishing attacks targeting wallet credentials, seed phrases, or platform
session tokens;

(d) fake contract fraud, in which a Counterparty submits an escrow with
fraudulent underlying contract documents;

(e) proof-of-work fraud, in which fraudulent or stolen work product is submitted
as proof of completion;

(f) juror collusion, in which jurors coordinate to fix dispute outcomes; and

(g) platform-impersonation scams, in which third parties operate fake versions
of the Platform to steal credentials or funds.

**16.6 Reporting Fraud.** If You suspect that a User is engaging in fraud,
scamming, or other malicious activity, You are encouraged to report it to the
Operator using the contact information in Section 35. The Operator may, in its
sole discretion, investigate and take action against suspected bad actors, but
is under no obligation to do so.

**16.7 Independent Verification.** Before relying on any information displayed
in the Platform — including reputation scores, contract documents, proof-of-work
submissions, wallet addresses, or User-provided claims — You should
independently verify that information through sources other than the Platform.

---

## 17. Decision-Making Disclaimer and User Responsibility

**17.1 User Decisions Are User Responsibility.** All decisions made in
connection with, through, or in reliance upon the Platform are Your sole and
exclusive responsibility. The Platform provides technology, tools,
infrastructure, and interfaces; it does not make decisions for You, advise You,
or take responsibility for Your decisions.

**17.2 Categories of User Decisions.** Without limiting Section 17.1, You assume
sole and exclusive responsibility for:

(a) all financial decisions, including decisions to deposit, hold, release, or
transfer cryptocurrency;

(b) all business decisions, including decisions to engage, hire, or contract
with any Counterparty;

(c) all contract decisions, including decisions regarding the terms, value, and
conditions of any escrow or freelance agreement;

(d) all legal decisions, including decisions regarding the legal enforceability
or adequacy of any agreement or contract document;

(e) all operational decisions, including how to manage projects, deadlines, and
deliverables;

(f) all hiring and engagement decisions, including selection of freelancers or
clients;

(g) all investment decisions, including decisions regarding cryptocurrency
allocation or risk tolerance;

(h) all compliance decisions, including ensuring Your use of the Platform
complies with applicable law;

(i) all vendor and partnership decisions made through or in connection with the
Platform; and

(j) all other decisions made using or in reliance upon information provided by
or through the Services.

**17.3 No Endorsement of Counterparties.** The Operator does not endorse,
recommend, vouch for, certify, or otherwise express approval of any User,
Counterparty, contract, transaction, project, or opportunity accessible through
the Platform.

**17.4 Reliance at Your Own Risk.** Any reliance You place on any of the
following is entirely at Your own risk:

(a) Platform Content, including contract documents, evidence submissions, and
ratings;

(b) AI Output, analytics, or automated recommendations provided through the
Services;

(c) User-generated Content submitted by other Users;

(d) Platform communications, notifications, and messages;

(e) Oracle data, price feeds, or market data;

(f) Reputation scores or user profiles; and

(g) Any other information accessed through or in connection with the Services.

**17.5 Past Performance.** Past performance of any User, contract, or outcome on
the Platform is not indicative of future performance. Positive historical
interactions do not guarantee future reliability, honesty, or performance.

---

## 18. AI, Automation, and Generated Outputs

**18.1 AI Outputs May Be Inaccurate.** Where the Services incorporate or
integrate artificial intelligence, large language models, machine learning
systems, or other automated content generation tools, any AI Output produced by
such systems:

(a) may be inaccurate, incomplete, factually incorrect, or misleading;

(b) may contain hallucinations, fabrications, or confabulations that appear
plausible but are not factually correct;

(c) may become outdated as facts, laws, markets, technology, or circumstances
change;

(d) may reflect biases present in training data;

(e) may not reflect current law, regulation, or professional standards;

(f) may contain errors in legal, financial, technical, or other specialized
areas; and

(g) should never be relied upon as a substitute for independent professional
advice.

**18.2 Independent Verification Required.** You are solely responsible for
independently verifying the accuracy, completeness, and suitability of any AI
Output before relying upon it for any purpose. You must not make any significant
decision — including legal, financial, contractual, technical, or commercial
decisions — solely on the basis of AI Output.

**18.3 No Responsibility for AI Output.** The Operator assumes no
responsibility, liability, or obligation for any decisions made, actions taken,
or harm suffered as a result of reliance on AI Output. THE OPERATOR DISCLAIMS
ALL WARRANTIES, EXPRESS OR IMPLIED, REGARDING THE ACCURACY, COMPLETENESS, OR
FITNESS FOR ANY PURPOSE OF AI OUTPUT.

**18.4 Automated Processes.** Certain Services involve automated processes,
including cron-based deadline reminders, automatic state transitions in the
Smart Contracts, automated juror selection, and automated notification delivery.
The Operator makes no guarantee that any automated process will execute at the
precise intended time, without error, or without interruption.

**18.5 Future AI Features.** The Platform may in the future incorporate
additional AI-powered features including but not limited to evidence analysis,
contract analysis, reputation scoring, fraud detection, user assistance, and
dispute analysis. All such future features are subject to the protections in
this Section and to the Disclaimers of Warranties in Section 27 and the
Limitation of Liability in Section 28.

---

## 19. Storage Systems, IPFS, and File Handling

**19.1 IPFS Storage.** The Platform may use IPFS, including via Pinata or
similar pinning services, to store evidence URIs, contract document references,
and proof-of-work metadata. IPFS is a decentralized protocol operated
independently of the Operator. The Operator does not control IPFS's
availability, reliability, permanence, censorship resistance, or the persistence
of content stored therein.

**19.2 No Content Guarantee.** The Operator does not guarantee that files pinned
to IPFS or any other decentralized storage system will remain accessible,
retrievable, intact, or available over any time period. Pinning services may
discontinue operations, lose data, or cease to pin specific content.

**19.3 Off-Chain Data.** Large or sensitive documents should not be stored
directly on-chain. Where documents are stored off-chain, only their
cryptographic hash or URI is recorded in the Smart Contracts. The Operator is
not responsible for the loss, corruption, alteration, or inaccessibility of
off-chain content referenced by on-chain records. On-chain records will persist
but the underlying documents may become permanently inaccessible if off-chain
storage fails.

**19.4 Encryption.** The Platform provides optional client-side AES-GCM
encryption helpers for documents. The Operator makes no guarantee that any
encryption implementation is free from defects, vulnerabilities, or
compatibility issues. You are solely responsible for managing encryption keys,
the secure storage of encryption keys, and the security of any encrypted
documents You generate or upload. Loss of encryption keys results in permanent,
irrecoverable loss of access to encrypted content.

**19.5 Arweave.** The Platform may support optional Arweave storage. Arweave is
a third-party protocol operated entirely independently of the Operator. The
Operator makes no representations regarding Arweave's permanence, availability,
performance, security, or continued operation.

**19.6 File Responsibility.** You are solely responsible for all files,
documents, and data that You upload, pin, link, or submit through the Services.
You must ensure that any files You upload do not infringe any third party's
rights, do not contain malware, do not contain unlawful content, and do not
violate these Terms.

---

## 20. Oracle and Price-Feed Services

**20.1 Display Purposes Only.** Exchange rate data and other market data
provided by the Platform's oracle features is for informational and display
purposes only. Such data may be delayed, inaccurate, stale, incomplete, or
unavailable at any time.

**20.2 No Financial Reliance.** You should not rely on oracle data provided
through the Services as the sole or primary basis for any financial decision,
transaction valuation, smart contract interaction, or business decision. The
Operator makes no warranty regarding the accuracy, timeliness, completeness, or
fitness for purpose of any oracle data.

**20.3 Third-Party Oracle Providers.** Oracle data may be sourced from
third-party providers operating independently of the Operator. The Operator is
not responsible for the accuracy, availability, integrity, or manipulation of
data provided by third-party oracle services.

**20.4 Oracle Failure.** Oracle services may fail, produce incorrect data, or
become unavailable. The Operator is not responsible for any losses or adverse
outcomes resulting from oracle failures, oracle manipulation, stale data, or
incorrect price feeds.

---

## 21. Authentication, Magic Links, and Email Services

**21.1 Magic Link Authentication.** The Platform may offer email-based magic
link authentication. Magic links are temporary, single-use, and expire within a
limited time window. The Operator makes no guarantee that email delivery will be
instantaneous, that magic links will be delivered successfully, or that email
delivery will not be delayed or blocked by spam filters.

**21.2 Email Delivery.** Email notifications, magic links, and deadline
reminders are delivered via a third-party email service provider (currently
Resend). The Operator is not responsible for failed, delayed, filtered,
spam-classified, or undelivered email. The Operator is not responsible for any
consequences arising from Your failure to receive a notification email.

**21.3 Email Security.** You are responsible for the security of the email
account used to receive magic links or notifications. The Operator is not liable
for unauthorized access to Your platform session resulting from compromise of
Your email account, phishing of email links, or forwarding of magic links to
unauthorized parties.

**21.4 Notification Accuracy.** Deadline reminder notifications and other
automated notifications are provided on a best-effort basis only. The Operator
does not guarantee that all notifications will be delivered, accurate, timely,
or free from errors. You are responsible for independently monitoring all
contractual deadlines and Smart Contract state changes through Your Wallet and
the Frontend Application. You must not rely solely on email notifications for
managing time-sensitive contractual obligations.

**21.5 No Guarantee of Session Availability.** Magic link sessions may expire,
be invalidated, or become unavailable at any time. The Operator is not
responsible for any loss resulting from session expiration.

---

## 22. Privacy and Data Handling

**22.1 Data Collection.** The Platform may collect certain information in
connection with Your use of the Services, including wallet addresses, email
addresses (where provided), transaction metadata, IP addresses, browser
information, device information, and usage analytics. By using the Services, You
consent to the collection, use, and processing of such information as described
in this Section and in the Privacy Policy published at `PRIVACY_POLICY.md`,
which is incorporated by reference.

**22.2 Public Blockchain Data.** Transactions submitted to a blockchain are
publicly visible, immutable, and permanently associated with the submitting
Wallet address. The Operator has no ability to make blockchain Transactions
private or to remove on-chain data. Submitting a Transaction is an irreversibly
public act.

**22.3 Third-Party Processors.** The Platform depends upon third-party service
providers — including email delivery services, IPFS pinning services, blockchain
node providers, analytics services, and cloud infrastructure providers — to
operate the Services. Such third parties may process certain of Your data in
accordance with their own privacy policies and practices. The Operator is not
responsible for the data practices of third-party processors.

**22.4 No Absolute Security.** The Operator implements reasonable technical and
organizational measures to protect non-public data held in connection with the
Services. However, no security measure is absolute, and the Operator cannot
guarantee the confidentiality, integrity, or availability of any data
transmitted to or from the Services. **YOU ACKNOWLEDGE THAT NO SYSTEM IS
COMPLETELY SECURE AND THAT DATA BREACHES, UNAUTHORIZED ACCESS, AND LOSS OF DATA
ARE INHERENT RISKS OF OPERATING ANY ONLINE PLATFORM.**

**22.5 International Processing.** The Services may be operated from and may
process data in jurisdictions other than Your own. By using the Services, You
consent to the transfer and processing of Your data in any jurisdiction where
the Operator or its service providers operate, including jurisdictions that may
provide lesser data protection than Your home jurisdiction.

**22.6 Wallet Address Privacy.** Your Wallet address is a pseudonymous but
publicly visible identifier on the blockchain. Advanced blockchain analytics may
allow third parties to associate Your Wallet address with Your identity. The
Operator is not responsible for any privacy loss arising from Your Wallet
activity being analyzed or de-anonymized by third parties.

**22.7 API Secrets and Credentials.** You must never include private keys, seed
phrases, API secrets, HMAC tokens, bearer tokens, or other credentials in any
field visible to other Users or in User Content submitted to the Services.

**22.8 Privacy Policy.** The Privacy Policy (published as `PRIVACY_POLICY.md`)
governs the collection, use, storage, and processing of personal data in
connection with the Services and is incorporated by reference into these Terms.

---

## 23. Security

**23.1 Unaudited Contracts.** As expressly noted in the Platform's technical
documentation, **THE SMART CONTRACTS ASSOCIATED WITH THE PLATFORM HAVE NOT, AS
OF THE EFFECTIVE DATE, BEEN SUBJECT TO AN INDEPENDENT THIRD-PARTY SECURITY
AUDIT, AND NO AUDIT REPORT IS AVAILABLE.** You acknowledge this material risk.
You should not use the Platform for the custody of significant or irreplaceable
funds until You have independently assessed the security of the Smart Contracts
or a credible third-party audit has been published.

**23.2 No Security Guarantee.** The Operator makes no representation or warranty
that the Platform, Smart Contracts, APIs, IPFS integrations, oracle connections,
email services, or any related infrastructure are free from security
vulnerabilities, bugs, backdoors, or defects that could result in unauthorized
access, loss of funds, loss of data, manipulation of outcomes, or other harm.
Security vulnerabilities are an inherent and unavoidable risk in all software
systems.

**23.3 Responsible Disclosure.** If You discover a security vulnerability in the
Platform, the Smart Contracts, or any related infrastructure, You agree to
report it responsibly to the Operator through the Security Policy published in
the repository (`SECURITY.md`) prior to any public disclosure. You agree not to
exploit any vulnerability You discover for personal gain, for the gain of third
parties, or to the detriment of any User. Responsible disclosure is encouraged
and appreciated.

**23.4 Prohibited Security Testing.** You may not conduct penetration testing,
vulnerability scanning, fuzz testing, exploit development, or other security
testing against the Operator's hosted infrastructure, live API endpoints, or
production Frontend Application without the Operator's prior express written
authorization. Testing of the open-source Smart Contract code on public testnets
in accordance with the Apache License is permitted but must not target the
Operator's own deployments without authorization.

**23.5 User Security Obligations.** You agree to: (a) use strong and unique
passwords for all accounts; (b) enable hardware wallet security, two-factor
authentication, or multi-factor authentication where available; (c) maintain
current security patches on all devices; (d) not re-use passwords; (e) not store
seed phrases or private keys digitally or in cloud storage; (f) verify Smart
Contract addresses before interacting with them; and (g) promptly notify the
Operator of any suspected security breach.

**23.6 Smart Contract Verification.** Before interacting with any Smart Contract
in connection with the Platform, You should independently verify the deployed
contract addresses against official sources. The Operator is not responsible for
losses arising from interaction with counterfeit, fraudulent, or maliciously
modified contracts deployed by third parties.

---

## 24. Third-Party Services and Integrations

**24.1 Third-Party Services.** The Platform integrates with or depends upon
third-party services, including without limitation: Alchemy, Infura, and other
blockchain node providers; Reown AppKit, wagmi, viem, and wallet-connection
software; Resend email delivery; Pinata IPFS pinning; Arweave decentralized
storage; Vercel hosting and edge infrastructure; GitHub Actions for CI/CD;
external oracle and price-feed services; OpenZeppelin contract libraries; and
other third-party APIs and integrations (collectively, "Third-Party Services").

**24.2 No Responsibility for Third Parties.** The Operator does not endorse,
control, warrant, or assume any responsibility for the availability, accuracy,
security, privacy practices, or terms of service of any Third-Party Service.
Your use of any Third-Party Service is subject to that service's own terms and
policies, which You are responsible for reviewing.

**24.3 Third-Party Downtime and Failures.** The Operator is not responsible for
any disruption to the Services caused by the failure, unavailability, degraded
performance, or discontinued operation of any Third-Party Service, including
cloud hosting providers, blockchain node providers, oracle services, email
delivery services, IPFS pinning services, or wallet-connection software.

**24.4 Wallet Software.** The Operator does not control wallet software,
hardware wallet firmware, browser extensions, or mobile wallet applications used
to interact with the Services. The Operator is not responsible for any loss or
harm arising from defects, vulnerabilities, malicious code, or user error in
wallet software.

**24.5 Blockchain Networks.** The Ethereum, Arbitrum One, Base, and Optimism
networks and all other supported blockchains are decentralized networks operated
independently of the Operator by distributed validators, miners, or node
operators. The Operator is not responsible for network congestion, fork events,
protocol changes, validator behavior, chain reorganizations, or any other
developments on blockchain networks.

**24.6 Changes to Third-Party Services.** Third-Party Services may change their
APIs, terms of service, pricing, or technical requirements, or may discontinue
operations entirely. The Operator is not responsible for any disruption or loss
caused by such changes.

---

## 25. No Professional Advice

**25.1 Not Legal Advice.** Nothing in the Services, the Smart Contracts, the
Frontend Application, the documentation, or any communication from the Operator
constitutes legal advice. The Platform is a technology tool, not a law firm. You
should consult a qualified, licensed attorney in Your jurisdiction before
entering into any legally significant agreement, submitting or defending any
dispute, structuring any transaction, or taking any action that may have legal
consequences.

**25.2 Not Financial Advice.** Nothing in the Services constitutes financial
advice, investment advice, securities advice, tax advice, or accounting advice.
Cryptocurrency transactions involve significant financial risk. You should
consult a qualified financial adviser, accountant, or tax professional before
making any financial decisions in connection with the Services.

**25.3 Not Compliance Advice.** Nothing in the Services constitutes regulatory,
compliance, or licensing advice. The legal and regulatory treatment of
blockchain technology, cryptocurrency, digital assets, decentralized finance,
and smart contracts varies by jurisdiction and is subject to rapid change. You
are solely responsible for ensuring that Your use of the Services complies with
all applicable laws, regulations, and reporting obligations in Your
jurisdiction.

**25.4 Not Employment or Labor Advice.** Nothing in the Services constitutes
employment law advice, human resources advice, or advice regarding the
classification of workers as employees, independent contractors, or other
categories. You should consult qualified legal counsel regarding any questions
about worker classification, employment obligations, or applicable labor laws.

**25.5 Not Business Advice.** Nothing in the Services constitutes business
strategy advice, management consulting advice, or advice regarding business
formation, structure, or operations.

**25.6 No Reliance.** You agree that You will not rely upon any information,
content, output, or communication provided through or in connection with the
Services as a substitute for independent professional advice appropriate to Your
specific circumstances. The Operator assumes no responsibility for Your reliance
on such information.

---

## 26. Future Features and Platform Evolution

**26.1 Broad Application of These Terms.** These Terms are drafted to cover not
only the current functionality of the Platform but also all future features,
capabilities, and services that may be developed, integrated, or made available
through the Platform. The protections, disclaimers, liability limitations, and
user obligations in these Terms apply to all current and future features,
including without limitation:

(a) AI-powered features, analysis tools, recommendation engines, and automated
decision-support systems;

(b) payment, billing, invoicing, and subscription management features;

(c) expanded marketplace features, including vendor directories, project
listings, or bidding systems;

(d) enhanced identity verification, KYC, or credential verification features;

(e) expanded API integrations and developer tools;

(f) collaboration features, workspaces, and team management tools;

(g) document management, e-signature, and contract lifecycle management
features;

(h) expanded storage features, including additional file formats and storage
integrations;

(i) mainnet smart contract deployments on additional EVM networks;

(j) governance mechanisms, token-based voting, or DAO features;

(k) expanded oracle integrations, including VRF randomness and price feeds;

(l) analytics, reporting, and business intelligence features; and

(m) any other features, services, or capabilities not yet developed or
announced.

**26.2 No Guarantee of Future Availability.** The Operator is not obligated to
develop, maintain, or continue to provide any specific feature, whether
described in these Terms, on the Platform, or in any roadmap, announcement, or
other communication.

**26.3 Future Commercial Features.** The Platform may introduce paid features,
subscription tiers, transaction fees, platform fees, or other pricing in the
future. All such future commercial features will be governed by these Terms as
supplemented by applicable pricing and payment terms.

---

## 27. Disclaimers of Warranties

**27.1 "AS IS" and "AS AVAILABLE."** THE PLATFORM AND ALL SERVICES ARE PROVIDED
STRICTLY "AS IS," "AS AVAILABLE," AND "WITH ALL FAULTS," WITHOUT WARRANTY OF ANY
KIND, EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, TO THE MAXIMUM EXTENT PERMITTED
BY APPLICABLE LAW.

**27.2 Comprehensive Disclaimer.** TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE
LAW, THE RELEASED PARTIES HEREBY EXPRESSLY AND COMPLETELY DISCLAIM ALL
WARRANTIES, REPRESENTATIONS, AND CONDITIONS OF ANY KIND, INCLUDING WITHOUT
LIMITATION:

(a) ANY IMPLIED WARRANTY OF **MERCHANTABILITY**;

(b) ANY IMPLIED WARRANTY OF **FITNESS FOR A PARTICULAR PURPOSE** OR FOR ANY
SPECIFIC USE;

(c) ANY IMPLIED WARRANTY OF **NON-INFRINGEMENT** OF THIRD-PARTY RIGHTS;

(d) ANY WARRANTY OF **TITLE** OR QUIET ENJOYMENT;

(e) ANY WARRANTY THAT THE SERVICES WILL BE **UNINTERRUPTED**, CONTINUOUS,
TIMELY, SECURE, OR **ERROR-FREE**;

(f) ANY WARRANTY OF **AVAILABILITY**, **UPTIME**, OR ACCESSIBILITY AT ANY
PARTICULAR TIME OR FOR ANY PERIOD;

(g) ANY WARRANTY AS TO THE **ACCURACY**, COMPLETENESS, RELIABILITY, TIMELINESS,
CURRENCY, OR USEFULNESS OF ANY INFORMATION, CONTENT, DATA, AI OUTPUT, OR ORACLE
OUTPUT PROVIDED THROUGH THE SERVICES;

(h) ANY WARRANTY THAT THE SERVICES WILL MEET YOUR REQUIREMENTS OR ACHIEVE ANY
PARTICULAR RESULT, OUTCOME, OR OBJECTIVE;

(i) ANY WARRANTY AS TO THE **SECURITY** OF THE SERVICES, THE SMART CONTRACTS,
THE PLATFORM INFRASTRUCTURE, OR ANY DATA TRANSMITTED TO OR FROM THE SERVICES;

(j) ANY WARRANTY THAT DEFECTS, BUGS, OR ERRORS WILL BE CORRECTED;

(k) ANY WARRANTY AS TO THE **LEGAL ENFORCEABILITY** OF ANY CONTRACT, AGREEMENT,
PROPOSAL, OR DISPUTE OUTCOME CREATED THROUGH THE SERVICES;

(l) ANY WARRANTY REGARDING THE **CORRECTNESS, FAIRNESS, OR IMPARTIALITY** OF ANY
SMART CONTRACT EXECUTION, ARBITRATION RULING, JUROR VOTE, OR AUTOMATED OUTCOME;

(m) ANY WARRANTY REGARDING THE **PERFORMANCE**, SCALABILITY, INTEROPERABILITY,
OR COMPATIBILITY OF THE SMART CONTRACTS WITH ANY BLOCKCHAIN NETWORK, ERC-20
TOKEN, ORACLE, WALLET, OR OTHER CONTRACT OR SYSTEM;

(n) ANY WARRANTY REGARDING THE **AVAILABILITY** OR PERMANENCE OF ANY IPFS
CONTENT, ARWEAVE CONTENT, OR OTHER DECENTRALIZED STORAGE CONTENT;

(o) ANY WARRANTY THAT ORACLE DATA, PRICE FEEDS, OR EXCHANGE RATE INFORMATION
PROVIDED THROUGH THE SERVICES IS ACCURATE, CURRENT, OR RELIABLE;

(p) ANY WARRANTY REGARDING ANY AI OUTPUT, AUTOMATED ANALYSIS, OR GENERATED
CONTENT;

(q) ANY WARRANTY REGARDING THE IDENTITY, QUALIFICATIONS, CREDITWORTHINESS,
COMPETENCE, OR GOOD FAITH OF ANY USER OR COUNTERPARTY;

(r) ANY WARRANTY THAT THE SERVICES COMPLY WITH THE LAWS OF ANY JURISDICTION;

(s) ANY WARRANTY THAT THE SERVICES ARE FREE FROM VIRUSES, MALWARE, OR HARMFUL
COMPONENTS;

(t) ANY WARRANTY ARISING FROM COURSE OF DEALING, COURSE OF PERFORMANCE, TRADE
USAGE, OR INDUSTRY PRACTICE; AND

(u) ANY OTHER WARRANTY NOT EXPRESSLY STATED IN THESE TERMS.

**27.3 No Guarantee of Funds Recovery.** THE OPERATOR MAKES NO GUARANTEE THAT
FUNDS DEPOSITED INTO ESCROW WILL BE RECOVERABLE IN THE EVENT OF A SMART CONTRACT
BUG, DEFECT, EXPLOIT, REENTRANCY ATTACK, BLOCKCHAIN FORK, NETWORK ATTACK, KEY
COMPROMISE, ORACLE MANIPULATION, OR ANY OTHER CAUSE. DEPOSITING FUNDS INTO THE
ESCROW CONTRACT IS AN INHERENTLY RISKY ACT, AND YOU MAY LOSE ALL DEPOSITED
FUNDS.

**27.4 Assumption of Risk.** YOUR USE OF THE SERVICES IS ENTIRELY AT YOUR OWN
RISK. YOU EXPRESSLY ACKNOWLEDGE AND ACCEPT ALL RISKS ASSOCIATED WITH THE USE OF
BLOCKCHAIN TECHNOLOGY, SMART CONTRACTS, CRYPTOCURRENCY, DECENTRALIZED SYSTEMS,
IPFS, ORACLES, WALLET SOFTWARE, AND ALL OTHER COMPONENTS OF THE SERVICES.

**27.5 Platform in Development.** The Platform is actively developed software
that may contain errors, incomplete features, or untested code paths. Features
may be added, modified, or removed at any time. The Operator makes no
representation regarding the stability, completeness, or readiness of the
Platform for any particular use.

---

## 28. Limitation of Liability

**28.1 Exclusion of Damages.** TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE
LAW, IN NO EVENT SHALL ANY RELEASED PARTY BE LIABLE TO YOU OR ANY THIRD PARTY
FOR ANY DAMAGES OR LOSSES OF ANY KIND, INCLUDING WITHOUT LIMITATION:

(a) INDIRECT DAMAGES OF ANY KIND;

(b) INCIDENTAL DAMAGES;

(c) SPECIAL DAMAGES;

(d) CONSEQUENTIAL DAMAGES;

(e) EXEMPLARY DAMAGES;

(f) PUNITIVE DAMAGES;

(g) DIRECT DAMAGES, TO THE EXTENT PERMITTED BY APPLICABLE LAW;

(h) LOSS OF PROFITS, REVENUE, BUSINESS OPPORTUNITIES, OR ANTICIPATED SAVINGS;

(i) LOSS OF DATA, CONTENT, INFORMATION, OR RECORDS;

(j) LOSS OF GOODWILL, REPUTATION, OR BRAND VALUE;

(k) LOSS OF OPPORTUNITY, CONTRACTS, OR BUSINESS RELATIONSHIPS;

(l) BUSINESS INTERRUPTION OR LOSS OF USE;

(m) COST OF PROCURING SUBSTITUTE GOODS OR SERVICES;

(n) LOSS OF CRYPTOCURRENCY, DIGITAL ASSETS, ESCROWED FUNDS, JUROR STAKES, OR
OTHER BLOCKCHAIN-BASED ASSETS;

(o) LOST SAVINGS, WASTED EXPENDITURES, OR RELIANCE LOSSES; OR

(p) ANY OTHER ECONOMIC LOSS, FINANCIAL HARM, OR CONSEQUENTIAL HARM OF ANY
NATURE,

ARISING OUT OF OR IN ANY WAY RELATING TO: YOUR USE OF, OR INABILITY TO USE, THE
SERVICES; ANY TRANSACTION, CONTRACT, AGREEMENT, OR ARRANGEMENT FACILITATED
THROUGH THE PLATFORM; ANY SMART CONTRACT EXECUTION OR FAILURE; ANY BLOCKCHAIN
NETWORK BEHAVIOR; ANY USER CONDUCT OR MISCONDUCT; ANY THIRD-PARTY SERVICE
FAILURE; OR ANY OTHER MATTER RELATED TO THE PLATFORM, EVEN IF A RELEASED PARTY
HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES, AND EVEN IF A REMEDY FAILS
OF ITS ESSENTIAL PURPOSE.

**28.2 Aggregate Liability Cap.** TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE
LAW, THE TOTAL AGGREGATE LIABILITY OF ALL RELEASED PARTIES TO YOU FOR ALL CLAIMS
ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICES, REGARDLESS OF THE
FORM OR THEORY OF ACTION (WHETHER IN CONTRACT, TORT, STRICT LIABILITY, STATUTE,
EQUITY, OR OTHERWISE), SHALL NOT EXCEED THE GREATER OF: (A) ONE HUNDRED UNITED
STATES DOLLARS (USD $100.00); OR (B) THE TOTAL AMOUNT ACTUALLY PAID BY YOU TO
THE OPERATOR FOR ACCESS TO THE SERVICES IN THE TWELVE (12) CALENDAR MONTHS
IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.

**28.3 Essential Basis of Bargain.** YOU ACKNOWLEDGE AND AGREE THAT THE
LIABILITY LIMITATIONS IN THIS SECTION REFLECT A REASONABLE, FAIR, AND NEGOTIATED
ALLOCATION OF RISK BETWEEN THE PARTIES AND CONSTITUTE AN ESSENTIAL ELEMENT OF
THE BASIS OF THE BARGAIN. THE OPERATOR WOULD NOT MAKE THE SERVICES AVAILABLE
WITHOUT THESE LIMITATIONS. THE LIMITATIONS APPLY REGARDLESS OF WHETHER A REMEDY
FAILS OF ITS ESSENTIAL PURPOSE.

**28.4 Enumerated Scope.** WITHOUT LIMITING THE GENERALITY OF SECTIONS 28.1 AND
28.2, THE LIMITATIONS IN THIS SECTION APPLY TO ALL CLAIMS ARISING FROM:

(a) SOFTWARE DEFECTS, BUGS, ERRORS, OR UNINTENDED BEHAVIOR IN THE SMART
CONTRACTS, FRONTEND APPLICATION, API ROUTES, OR ANY OTHER COMPONENT;

(b) SECURITY VULNERABILITIES, DATA BREACHES, UNAUTHORIZED ACCESS, WALLET
COMPROMISE, OR ACCOUNT TAKEOVER;

(c) DOWNTIME, OUTAGES, SERVICE INTERRUPTIONS, OR FAILURE OF ANY PLATFORM
COMPONENT;

(d) DATA CORRUPTION, DATA LOSS, DATA DESTRUCTION, OR DATA INACCESSIBILITY;

(e) AUTHENTICATION FAILURES, SESSION EXPIRATION, OR MAGIC LINK DELIVERY
FAILURES;

(f) ACCOUNT SUSPENSION, RESTRICTION, OR TERMINATION;

(g) INFRASTRUCTURE FAILURES, HOSTING PROVIDER OUTAGES, OR CLOUD PROVIDER
FAILURES;

(h) THIRD-PARTY SERVICE FAILURES, API OUTAGES, ORACLE FAILURES, OR INTEGRATION
FAILURES;

(i) BLOCKCHAIN NETWORK ISSUES, FORK EVENTS, CONSENSUS FAILURES, CHAIN
REORGANIZATIONS, OR VALIDATOR BEHAVIOR;

(j) IPFS, ARWEAVE, OR OTHER DECENTRALIZED STORAGE UNAVAILABILITY OR CONTENT
LOSS;

(k) ORACLE FAILURES, INACCURATE PRICE FEEDS, STALE DATA, OR ORACLE MANIPULATION;

(l) SMART CONTRACT BUGS, EXPLOITS, REENTRANCY ATTACKS, SANDWICH ATTACKS, OR
UNINTENDED STATE TRANSITIONS;

(m) JUROR SELECTION FAILURES, COLLUSION, INCORRECT RULINGS, OR ARBITRATION
ERRORS;

(n) LOSS OF ESCROWED FUNDS, JUROR STAKES, GAS FEES, OR ANY OTHER FUNDS DUE TO
ANY CAUSE WHATSOEVER;

(o) HUMAN ERROR, USER ERROR, INCORRECT TRANSACTION PARAMETERS, OR WRONG NETWORK
SELECTION;

(p) REGULATORY CHANGES AFFECTING THE LEGALITY, AVAILABILITY, OR OPERATION OF THE
SERVICES;

(q) ENCRYPTION OR DECRYPTION FAILURES;

(r) EMAIL DELIVERY FAILURES, MISSED DEADLINE NOTIFICATIONS, OR DELAYED
NOTIFICATIONS;

(s) ERC-20 TOKEN ANOMALIES, INCLUDING FEE-ON-TRANSFER BEHAVIOR, REBASE EVENTS,
PAUSABILITY, OR UPGRADE EVENTS;

(t) FRAUD, SCAMS, PHISHING, SOCIAL ENGINEERING, IMPERSONATION, OR COUNTERPARTY
MISCONDUCT;

(u) DISPUTES BETWEEN USERS, INCLUDING FREELANCER DISPUTES, CLIENT DISPUTES,
MARKETPLACE DISPUTES, AND ARBITRATION DISPUTES;

(v) AI OUTPUT INACCURACIES, HALLUCINATIONS, OR ERRORS;

(w) FORCE MAJEURE EVENTS AS DEFINED IN SECTION 34.5; OR

(x) ANY OTHER CAUSE RELATING TO THE USE OR INABILITY TO USE THE SERVICES.

**28.5 Jurisdictional Variations.** SOME JURISDICTIONS DO NOT ALLOW THE
EXCLUSION OR LIMITATION OF CERTAIN WARRANTIES OR DAMAGES. IN SUCH JURISDICTIONS,
THE FOREGOING LIMITATIONS AND EXCLUSIONS SHALL APPLY TO THE MAXIMUM EXTENT
PERMITTED BY APPLICABLE LAW. NOTHING IN THESE TERMS LIMITS LIABILITY THAT CANNOT
BE EXCLUDED OR LIMITED UNDER APPLICABLE LAW, INCLUDING LIABILITY FOR DEATH OR
PERSONAL INJURY CAUSED BY GROSS NEGLIGENCE, FRAUD, OR WILLFUL MISCONDUCT WHERE
SUCH LIMITATION IS PROHIBITED BY LAW.

**28.7 Operator Fraud and Willful Misconduct.** Nothing in this Section 28
purports to limit the Operator's liability for: (a) the Operator's own actual
fraud or intentional deceit, to the extent such limitation is prohibited by
applicable law; (b) the Operator's own gross negligence or willful misconduct,
to the extent such limitation is prohibited by applicable law; or (c) any other
form of liability that cannot lawfully be limited or excluded under the laws of
Your jurisdiction. The limitations in Section 28 are intended to the fullest
extent permitted by law and shall not apply to liability that cannot be so
limited.

**28.8 Statutory Consumer Rights.** NOTHING IN THESE TERMS IS INTENDED TO LIMIT
OR EXCLUDE ANY RIGHT OR REMEDY THAT YOU HAVE AS A CONSUMER UNDER MANDATORY
APPLICABLE LAW THAT CANNOT BE EXCLUDED OR RESTRICTED BY CONTRACT, INCLUDING BUT
NOT LIMITED TO STATUTORY CONSUMER PROTECTION RIGHTS, IMPLIED TERMS THAT CANNOT
BE EXCLUDED, OR STATUTORY RIGHTS TO SEEK REMEDIES FROM A COURT. IF ANY PROVISION
OF THESE TERMS IS INCONSISTENT WITH A MANDATORY CONSUMER PROTECTION LAW IN YOUR
JURISDICTION, THAT MANDATORY LAW SHALL GOVERN TO THE EXTENT OF THE
INCONSISTENCY.

**28.6 No Class Action Damages.** Even if a class action or representative
action is permitted to proceed notwithstanding the class-action waiver in
Section 33.5, the Operator's aggregate liability in any such action shall be
calculated based on individual claims, not the aggregated claims of all class
members, and shall be subject to the cap in Section 28.2.

---

## 29. Indemnification

**29.1 Indemnification Obligation.** You agree, to the fullest extent permitted
by applicable law, to defend, indemnify, and hold harmless each of the Released
Parties from and against any and all claims, demands, actions, proceedings,
investigations, losses, liabilities, damages (including direct, indirect,
consequential, special, and punitive damages), costs, expenses (including
reasonable attorneys' fees, court costs, expert fees, and settlement costs),
penalties, fines, judgments, and settlements arising out of, related to, or
resulting from:

(a) Your access to or use of the Services, including use of the Smart Contracts,
Frontend Application, APIs, storage systems, oracle services, or any other
component;

(b) Your User Content, including claims that Your User Content infringes or
violates any third party's intellectual property rights, privacy rights,
personality rights, moral rights, or any other rights;

(c) Your violation of these Terms, including any representations and warranties
made herein;

(d) Your violation of any applicable law, regulation, rule, governmental order,
or third-party rights, including intellectual property rights, privacy rights,
contractual rights, or consumer protection rights;

(e) Your submission of fabricated, false, fraudulent, defamatory, or otherwise
harmful evidence, ratings, proof of work, or other Content through the Services;

(f) Your exploitation of any vulnerability, bug, or defect in the Smart
Contracts or Platform for personal gain or to the detriment of other Users;

(g) Your deployment or distribution of unauthorized, counterfeit, fraudulent, or
deceptive derivatives of the Platform that harm Users or third parties;

(h) Any dispute, claim, or proceeding arising between You and any Counterparty
in connection with a freelance agreement, escrow arrangement, arbitration
proceeding, or any other interaction facilitated through the Services;

(i) Your unauthorized use of the Marks or other intellectual property of the
Operator;

(j) Your fraud, intentional misconduct, willful wrongdoing, or bad faith in
connection with the Services;

(k) Your breach of any warranty or representation made in these Terms;

(l) Your violation of any applicable sanctions laws, export control laws, or
AML/CTF regulations;

(m) Claims by third parties arising from Your use of the Platform in violation
of their rights; or

(n) Regulatory inquiries, investigations, or enforcement actions arising from
Your use of the Services.

**29.2 Defense and Cooperation.** The Operator reserves the right, at its
option, to assume exclusive control over the defense and settlement of any claim
subject to indemnification by You. You agree to cooperate fully with the
Operator in the defense and resolution of any such claim, including by providing
access to relevant records, testifying as required, and bearing Your own costs
of cooperation. You may not settle any claim subject to this Section without the
Operator's prior written approval. Any settlement You enter without Operator
approval is void as against the Released Parties.

**29.3 Exclusion for Operator Negligence.** Notwithstanding Section 29.1, You
are not obligated to indemnify the Released Parties for losses, liabilities, or
damages arising solely and directly from the Operator's own gross negligence,
willful misconduct, or intentional fraud, to the extent such an indemnification
obligation would be unenforceable under applicable law. This carve-out is
intended only to the extent required by applicable law and does not otherwise
limit the scope of Your indemnification obligations.

---

## 30. Suspension and Termination

**30.1 Operator's Rights.** The Operator reserves the right, in its sole and
absolute discretion, at any time and for any reason or no reason, with or
without prior notice, to:

(a) suspend, restrict, rate-limit, or terminate Your access to the Services or
any part thereof;

(b) suspend, restrict, or terminate any feature, function, API, or component of
the Services;

(c) disable, moderate, or remove User Content that violates these Terms or
applicable law;

(d) modify, discontinue, or terminate the Services in whole or in part,
temporarily or permanently; or

(e) take any other technical, legal, or operational action the Operator deems
necessary to protect the integrity, security, or availability of the Services or
to protect Users, third parties, or the Operator.

**30.2 Grounds for Immediate Action.** Without limiting Section 30.1, the
following may result in immediate suspension or termination without prior
notice: (a) material or repeated violation of these Terms; (b) fraudulent,
abusive, harassing, or harmful activity; (c) receipt of a lawful order, legal
demand, or law enforcement request; (d) activity that poses an imminent security
risk to the Services or other Users; (e) suspected money laundering, sanctions
violations, or financial crime; (f) Smart Contract exploitation attempts; or (g)
unauthorized use of the Marks.

**30.3 Effect of Termination.** Upon any termination or suspension of Your
access to the Services: (a) all licenses and rights granted to You under these
Terms with respect to the Services immediately terminate; (b) You remain bound
by all provisions of these Terms that survive termination; (c) outstanding
blockchain Transactions confirmed before termination remain immutable and
unaffected; (d) termination does not affect any right of action the Operator may
have against You; and (e) the Operator has no obligation to refund any amounts
paid or to compensate You for any loss arising from termination.

**30.4 No Liability for Termination.** The Operator shall not be liable to You
or any third party for any termination or suspension of Your access to the
Services, regardless of the reason, including if such termination causes
financial loss, harm to Your reputation, or loss of business opportunities.

**30.5 Survival.** The following Sections survive any termination or expiration
of these Terms and continue in full force: Sections 1 (Definitions), 5
(Intellectual Property), 6 (Apache-2.0 Relationship), 7 (User Content), 8
(Feedback), 9 (Blockchain and Smart Contracts), 10 (Escrow Workflow), 11
(Arbitration Features), 12 (Reputation System), 13 (Marketplace Disclaimers), 14
(Financial Platform Protections), 15 (No Fiduciary Relationship), 16
(Anti-Fraud), 17 (Decision-Making Disclaimer), 18 (AI and Automation), 19
(Storage), 20 (Oracle), 22 (Privacy), 23 (Security), 24 (Third-Party Services),
25 (No Professional Advice), 27 (Disclaimers of Warranties), 28 (Limitation of
Liability), 29 (Indemnification), 32 (DMCA), 33 (Governing Law and Dispute
Resolution), and 34 (General Provisions).

---

## 31. Modifications to the Services and These Terms

**31.1 Service Modifications.** The Operator reserves the right, at any time and
in its sole discretion, to: (a) modify, update, add, remove, or deprecate any
feature, function, API, integration, network support, or component of the
Services; (b) suspend or discontinue any portion of the Services, temporarily or
permanently; (c) change the technical requirements for accessing the Services;
(d) change supported blockchain networks or smart contract deployments; (e)
change Third-Party Service integrations; (f) introduce pricing, fees,
subscriptions, or billing for any feature; and (g) change any policy, procedure,
or technical standard applicable to the Services.

**31.2 Modifications to These Terms.** The Operator reserves the right to modify
these Terms at any time. Modifications will be communicated by updating the
"Last Updated" date at the top of this document and, for material changes, by
posting a notice on the Platform or otherwise notifying You. Your continued
access to or use of the Services following the effective date of any
modification constitutes Your acceptance of the modified Terms. If You do not
agree to modified Terms, You must immediately cease using the Services.

**31.3 No Obligation to Maintain.** The Operator is under no obligation to
maintain, update, support, host, or continue to operate any aspect of the
Services. The Operator may discontinue the Services entirely, at any time,
without liability to any User.

---

## 32. DMCA and Copyright Complaints

**32.1 DMCA Notice.** The Operator responds to valid notices of alleged
copyright infringement in accordance with the Digital Millennium Copyright Act
("DMCA"), 17 U.S.C. § 512. The Operator has designated or intends to designate a
registered agent with the United States Copyright Office pursuant to 17 U.S.C. §
512(c)(2). Until such registration is confirmed, DMCA notices should be directed
to the contact information in Section 35. The Operator's entitlement to the DMCA
safe harbor is subject to maintaining applicable statutory conditions including
agent registration. To submit a DMCA takedown notice, send a written
communication to the address in Section 35 containing:

(a) identification of the copyrighted work claimed to have been infringed;

(b) identification of the allegedly infringing material, including its location
in the Services with sufficient specificity to permit the Operator to locate it;

(c) Your contact information (name, address, telephone number, and email
address);

(d) a statement that You have a good-faith belief that the disputed use is not
authorized by the copyright owner, its agent, or the law;

(e) a statement that the information in the notice is accurate, and under
penalty of perjury, that You are the copyright owner or authorized to act on the
owner's behalf; and

(f) Your physical or electronic signature.

**32.2 Counter-Notice.** If You believe that Content was removed or disabled in
response to a DMCA notice by mistake or misidentification, You may submit a
counter-notice pursuant to 17 U.S.C. § 512(g)(3). Submission of a false
counter-notice may result in legal liability.

**32.3 Repeat Infringers.** The Operator may, in its sole discretion, suspend or
terminate access to the Services for Users who are repeat infringers of
third-party copyright or other intellectual property rights.

**32.4 Limitation on Immutable Content.** DMCA takedown notices cannot result in
the removal of Content recorded on a public blockchain or permanently pinned to
a decentralized storage network. The Operator will disable or remove such
Content from the Frontend Application to the extent technically feasible, but it
cannot delete or alter immutable on-chain or decentralized storage records.

**32.5 False Notices.** Knowingly submitting a materially false DMCA notice or
counter-notice may expose You to civil or criminal liability. The Operator may
seek damages and legal fees against parties who submit knowing
misrepresentations.

---

## 33. Governing Law, Venue, and Dispute Resolution

**33.1 Governing Law.** These Terms and any dispute arising out of or relating
to these Terms, the Services, or the Platform shall be governed by and construed
in accordance with the laws of the State of Oregon, United States of America,
without regard to its conflict of law provisions.

**33.2 Venue.** Subject to the arbitration agreement in Section 33.3, You agree
that any legal action or proceeding arising out of or relating to these Terms or
the Services shall be brought exclusively in the state or federal courts of
competent jurisdiction located in Lane County, Oregon, and You irrevocably
consent to the personal jurisdiction and venue of such courts for such purposes.

**33.3 Arbitration Agreement.** PLEASE READ THIS SECTION CAREFULLY. IT
MATERIALLY AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN
COURT.

(a) **Agreement to Arbitrate.** Except as provided in Section 33.4, You and the
Operator agree to resolve any dispute, claim, controversy, or difference arising
out of or relating to these Terms, the Services, or the Platform (including
disputes regarding the existence, validity, formation, interpretation, breach,
or enforceability of these Terms) exclusively through final and binding
individual arbitration. If the parties cannot agree on an arbitration provider
within thirty (30) days of a written demand for arbitration, arbitration shall
be administered by the American Arbitration Association (AAA) under its
Commercial Arbitration Rules, as modified by these Terms.

(b) **Pre-Arbitration Notice.** Before initiating arbitration, You must send a
written notice of Your claim to the Operator at the contact information in
Section 35, describing the nature of Your claim and the relief sought. The
Operator must send a written notice of any claim to Your email address on file.
The parties shall attempt to resolve the dispute informally for thirty (30) days
from receipt of such notice before initiating arbitration.

(c) **Arbitrator's Authority.** The arbitrator shall have authority to award the
same remedies and relief as a court of competent jurisdiction, subject to the
limitations in these Terms. The arbitrator shall not have authority to award
punitive damages except as permitted by applicable law and consistent with these
Terms.

(d) **Location.** Arbitration shall be conducted remotely by video conference or
telephone where available. If in-person proceedings are required, they shall be
held in Lane County, Oregon, United States.

(e) **Costs and Fees.** Each party shall bear its own attorneys' fees and costs
in arbitration, subject to the arbitrator's authority to award fees and costs as
permitted by applicable law and the applicable arbitration rules.

(f) **Finality.** The arbitrator's award shall be final, binding, and
non-appealable except as permitted by applicable arbitration law, and may be
entered as a judgment in any court of competent jurisdiction.

(g) **Confidentiality.** Arbitration proceedings, including filings, evidence,
testimony, and awards, shall be confidential to the maximum extent permitted by
applicable law.

**33.4 Exceptions to Arbitration.** Notwithstanding Section 33.3: (a) either
party may seek emergency injunctive or other provisional equitable relief in a
court of competent jurisdiction to prevent irreparable harm or preserve the
status quo pending the conclusion of arbitration; (b) claims for infringement of
intellectual property rights, including trademark, copyright, patent, and trade
secret claims, may, at the Operator's option, be pursued in any court of
competent jurisdiction; and (c) claims within the jurisdictional limits of small
claims court may be brought in small claims court rather than arbitration.

**33.5 Class-Action Waiver.** TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW,
YOU AND THE OPERATOR EACH WAIVE THE RIGHT TO PARTICIPATE IN ANY CLASS ACTION
LAWSUIT, CLASS-WIDE ARBITRATION, CONSOLIDATED ARBITRATION, PRIVATE ATTORNEY
GENERAL ACTION, OR OTHER REPRESENTATIVE PROCEEDING. ALL DISPUTES SHALL BE
RESOLVED EXCLUSIVELY ON AN INDIVIDUAL BASIS. IF A COURT OR ARBITRATOR FINDS THAT
THE CLASS-ACTION WAIVER IS UNENFORCEABLE IN A PARTICULAR CASE, THE ARBITRATION
AGREEMENT SHALL NOT APPLY TO THAT CASE, AND IT SHALL PROCEED IN COURT UNDER
SECTION 33.2 WITHOUT A CLASS, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING.

Notwithstanding the foregoing: (a) This class-action waiver does not apply to
claims brought under California's Private Attorneys General Act (Labor Code
§2698 et seq.) ("PAGA") or equivalent state statutes, to the extent courts have
found such claims non-waivable; (b) This waiver does not apply to claims for
public injunctive relief that a court of competent jurisdiction determines
cannot be waived under applicable law (including under the McGill Rule as
interpreted by California courts); and (c) This waiver does not apply to any
statutory claim in Your jurisdiction whose waiver is prohibited by mandatory
law. The Operator reserves all rights to contest whether any particular claim
falls within these carve-outs.

**33.6 Jury Trial Waiver.** TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW,
YOU AND THE OPERATOR EACH IRREVOCABLY WAIVE ANY RIGHT TO A TRIAL BY JURY IN ANY
ACTION, CLAIM, OR PROCEEDING ARISING OUT OF OR RELATED TO THESE TERMS OR THE
SERVICES.

**33.7 Time Limitation.** ANY CLAIM OR CAUSE OF ACTION ARISING OUT OF OR
RELATING TO THESE TERMS OR THE SERVICES MUST BE FILED WITHIN ONE (1) YEAR AFTER
THE CAUSE OF ACTION ACCRUES. Claims not filed within this period are permanently
barred, regardless of any applicable statute of limitations.

**33.8 Choice of Law for Arbitration.** The Federal Arbitration Act (9 U.S.C. §§
1 et seq.) governs the interpretation and enforcement of Section 33.3,
notwithstanding the general governing law provision in Section 33.1.

**33.9 Consumer Arbitration Rules.** If You are a natural person using the
Services primarily for personal, family, or household purposes (a "Consumer"),
and if AAA arbitration applies under Section 33.3(a), arbitration shall be
administered under the AAA Consumer Arbitration Rules, as modified by these
Terms, rather than the AAA Commercial Arbitration Rules. In any consumer
arbitration: (a) the Operator shall pay all AAA administrative filing fees,
arbitrator fees, and hearing fees that exceed what You would pay to file a
comparable lawsuit in court; (b) the arbitrator may award any remedy available
in an individual court action; and (c) the arbitration will proceed in Your
county of residence or remotely at Your election. This Section does not apply to
disputes where You are acting in a commercial or business capacity.

**33.10 Mass Arbitration.** If twenty-five (25) or more similar claims are filed
against the Operator by Claimants represented by the same or coordinated counsel
within a 60-day period (a "Mass Arbitration Event"), the parties agree that all
such claims shall be grouped into batches of fifty (50) claims per batch (or
fewer if fewer remain), to be arbitrated sequentially in separate proceedings.
The results of the first completed batch may be used by the parties to
facilitate resolution of remaining batches. This batching procedure is intended
to manage the administrative burden of mass arbitration and does not waive any
right of any individual claimant.

**33.11 EU/UK Mandatory Rights.** If You are a resident of the European Union or
the United Kingdom, nothing in these Terms — including the arbitration
agreement, class-action waiver, governing law clause, or venue clause — is
intended to deprive You of any mandatory consumer protection right or remedy
guaranteed by the laws of Your country of residence that cannot be excluded or
restricted by contract. In such cases, the mandatory law of Your jurisdiction
applies to the extent of any conflict, without prejudice to the application of
these Terms in all other respects.

---

## 34. General Provisions

**34.1 Entire Agreement.** These Terms, together with the Apache License (as
applicable to the Licensed Code), the Privacy Policy, the Acceptable Use Policy,
the Risk Disclosure, the Disclaimer, and any supplemental terms specifically
provided for particular features or services (collectively, the "Agreement
Documents"), constitute the entire agreement between You and the Operator with
respect to the subject matter hereof, and supersede all prior and
contemporaneous understandings, negotiations, representations, and agreements,
whether written or oral. References in these Terms or the Agreement Documents to
additional policies such as a DMCA Policy, Trademark Policy, Content Policy,
Community Guidelines, or Cookie Policy refer to documents that the Operator may
publish separately; to the extent any such document has not been published, the
provisions of these Terms govern the relevant subject matter. In the event of
any conflict among the Agreement Documents, these Terms and Conditions control,
followed in order by the Privacy Policy, the Risk Disclosure, the Disclaimer,
and the Acceptable Use Policy.

**34.2 Severability.** If any provision of these Terms is held to be invalid,
illegal, unenforceable, or contrary to applicable law by a court or arbitrator
of competent jurisdiction, such provision shall be modified to the minimum
extent necessary to make it enforceable, or severed if it cannot be modified,
and the remaining provisions shall continue in full force and effect.

**34.3 Waiver.** No failure or delay by the Operator to exercise any right,
power, or remedy under these Terms shall operate as a waiver. No single or
partial exercise precludes further or full exercise. Waivers must be in writing
and signed by the Operator to be effective.

**34.4 Assignment.** You may not assign, transfer, delegate, or sublicense any
of Your rights or obligations under these Terms without the Operator's prior
written consent. Any purported assignment in violation of this Section is void.
The Operator may freely assign, transfer, or delegate its rights and obligations
under these Terms, including in connection with a merger, acquisition, corporate
reorganization, asset sale, or change of control, without restriction.

**34.5 Force Majeure.** The Operator shall not be liable for any failure or
delay resulting from events beyond its reasonable control, including without
limitation: acts of God, natural disasters, pandemics, epidemics, war,
terrorism, riots, civil unrest, fire, flood, earthquake, labor disputes,
governmental actions, regulatory changes, blockchain network failures, consensus
failures, protocol changes, power outages, internet infrastructure failures,
denial-of-service attacks, cyberattacks, or actions of Third-Party Service
providers.

**34.6 Notices.** Notices to the Operator shall be sent to the contact
information in Section 35. Notices to You may be sent to Your email address on
file, via in-platform notification, or by posting on the Platform.

**34.7 Headings.** Section and subsection headings are for convenience only and
shall not affect the interpretation or construction of these Terms.

**34.8 No Third-Party Beneficiaries.** Except with respect to the Released
Parties in Section 29, these Terms do not create third-party beneficiary rights
in any person or entity not a party to these Terms.

**34.9 Relationship of the Parties.** The relationship between You and the
Operator is solely that of independent contracting parties. Nothing in these
Terms creates any partnership, joint venture, agency, franchise, employment, or
fiduciary relationship.

**34.10 Remedies Cumulative.** The Operator's rights and remedies under these
Terms are cumulative and not exclusive of any other rights or remedies available
at law or in equity.

**34.11 Language.** These Terms are drafted in English. In the event of any
inconsistency between an English version and any translation, the English
version controls.

**34.12 Electronic Acceptance.** By accessing or using the Services in any
manner, You agree that electronic acceptance is legally binding and equivalent
to a written signature. You waive any right to assert that these Terms are
unenforceable on the basis that they were accepted electronically.

**34.13 Operator Identity.** These Terms are entered into with the individual or
entity operating the TrustLedger Platform, which may be a natural person,
unincorporated association, or other legal entity as reflected in Section 35.
The Operator makes no representation regarding the form of legal entity, its
ability to be sued, or its liability profile. You should seek independent legal
advice if You require certainty regarding the legal status of the party you are
contracting with.

**34.14 Notice of Electronic Contract Formation.** These Terms are formed
electronically. You acknowledge that You have had a reasonable opportunity to
review these Terms before accepting them. While the Operator recommends that
Users affirmatively acknowledge acceptance (e.g., by checking a box or clicking
"I Agree"), the Operator also relies on the browsewrap notice provided through
the Platform. YOU ACKNOWLEDGE THAT THE CONSPICUOUS POSTING OF THESE TERMS AND
THE NOTICE THAT ACCESS CONSTITUTES ACCEPTANCE PROVIDES ADEQUATE NOTICE OF THE
TERMS OF THIS AGREEMENT.

**34.15 Statutory Rights Savings Clause.** Nothing in these Terms is intended to
limit, exclude, or waive any right or remedy that You may have under mandatory
applicable law that cannot be excluded or waived by contract, including but not
limited to: (a) statutory consumer protection rights; (b) implied statutory
warranties or conditions that cannot be excluded by contract; (c) any right to
seek redress from a court or administrative body for a claim that cannot
lawfully be subject to mandatory arbitration; (d) any privacy right guaranteed
by mandatory applicable law; or (e) any other right that cannot lawfully be
contracted out of. Where any provision of these Terms conflicts with such
mandatory rights, that provision is modified or severed to the minimum extent
necessary to comply, and all other provisions remain in full force.

---

## 35. Contact Information

For questions about these Terms, to report potential violations, to submit DMCA
notices, to report security vulnerabilities, or for other inquiries:

**TrustLedger** Email: [kevinle3212@gmail.com](mailto:kevinle3212@gmail.com)
Repository:
[https://github.com/kevinle3212/TrustLedger](https://github.com/kevinle3212/TrustLedger)
Security Policy: See `SECURITY.md` in the repository for vulnerability
reporting. DMCA Policy: See `DMCA_POLICY.md` for full takedown procedures.
Privacy Policy: See `PRIVACY_POLICY.md`. Trademark Policy: See
`TRADEMARK_POLICY.md`. Acceptable Use Policy: See `ACCEPTABLE_USE_POLICY.md`.
Risk Disclosure: See `RISK_DISCLOSURE.md`.

---

## 36. Version History

| Version | Date         | Notes                                                           |
| ------- | ------------ | --------------------------------------------------------------- |
| 1.0.0   | June 9, 2026 | Initial publication.                                            |
| 2.0.0   | June 9, 2026 | Major expansion: financial platform protections, no fiduciary   |
|         |              | relationship, anti-fraud/due diligence, decision-making         |
|         |              | disclaimer, AI/automation section, future features, expanded    |
|         |              | definitions, strengthened indemnification and liability.        |
| 3.0.0   | June 9, 2026 | Legal red-team hardening: PAGA/McGill carve-outs, mass          |
|         |              | arbitration provision, consumer arbitration rules, EU/UK        |
|         |              | mandatory rights, Operator fraud carve-out from liability cap,  |
|         |              | gross negligence carve-out from indemnification, statutory      |
|         |              | rights savings clause, AML/KYC clarification, money transmitter |
|         |              | disclaimer clarification, DMCA agent registration notice,       |
|         |              | expanded survival clause, entire agreement document hierarchy,  |
|         |              | electronic contract formation notice, operator identity         |
|         |              | disclosure, §28.7 fraud carve-out, §28.8 consumer rights.       |

---

_These Terms and Conditions (Version 3.0.0) were last reviewed and updated on
June 9, 2026, following a comprehensive legal red-team audit. By accessing or
using the TrustLedger Platform or Services in any way, You acknowledge that You
have had a reasonable opportunity to read these Terms, that You have read,
understood, and agree to be legally bound by these Terms and Conditions in their
entirety, and that You are entering into a legally binding agreement._
