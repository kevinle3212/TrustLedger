# Notes

Public, shareable working notes for TrustLedger: ideas, research findings, and
decisions that are worth recording but are not yet ready for the formal
documentation in [`docs/`](docs/). Move anything here that the broader community
might benefit from. Keep private or unpolished jotting in `NOTES.local.md`
(git-ignored); promote an entry to this file once it is fit to share.

## Conventions

- Add new entries under the most fitting heading; create a new heading if none
  fits.
- Date entries where the timeline matters (`YYYY-MM-DD`).
- Link out to the relevant code, PRs, issues, or docs.
- When a note matures into formal guidance, move it into `docs/` and leave a
  short pointer here if useful.

## Research and Ideas

### Free-Tier API Provider Survey (2026-06-06)

> Free tiers change frequently — verify limits against official pricing pages
> before integrating. All data current as of June 2026.

---

#### AI Providers — Contract Summarization and Moderation

_Relevant to: Phase 4 (AI-generated contract summaries), Phase 6 (in-app message
moderation). See `src/services/aiSummary.ts` (pending)._

##### Google Gemini API (Gemini 2.5 Flash)

| Metric         | Gemini 2.5 Flash | Gemini 2.5 Flash-Lite | Gemini 2.5 Pro |
| -------------- | ---------------- | --------------------- | -------------- |
| RPM (free)     | 10               | 15                    | 5              |
| RPD (free)     | 250              | 1,000                 | 100            |
| TPM (free)     | 250,000          | 250,000               | 250,000        |
| Context window | 1 M tokens       | 1 M tokens            | 1 M tokens     |
| Card required  | No               | No                    | No             |

- **Privacy (free tier):** Google's terms explicitly permit using prompts and
  outputs to improve their models. This is a **hard blocker for production** —
  freelancer deliverables, wallet addresses, and escrow amounts would be exposed
  to training pipelines.
- **Upgrade path:** Tier 1 pay-as-you-go (~$0.075/M input tokens for Flash) opts
  out of training data use entirely; requires billing info.
- **Note (2025-12-07):** Google cut free-tier quotas 50-80% in December 2025.
- **Verdict:** Dev/prototype only due to privacy risk. RPD of 250 also
  borderline for a live app.

##### Groq

| Metric        | Free Tier |
| ------------- | --------- |
| RPM           | 30        |
| TPM           | 6,000     |
| Requests/day  | 14,400    |
| Card required | No        |

- **Models:** Llama 3.3 70B, Llama 3.1 8B/70B, Mixtral 8x7B, Gemma 2 9B.
- **Latency:** Best-in-class (LPU hardware); typical < 100 ms TTFT on short
  prompts.
- **Privacy:** Inference data not retained by default; temporary logs kept ≤ 30
  days for abuse/reliability only. Zero Data Retention (ZDR) toggle available in
  account settings — enable it before processing real user contract data.
- **Upgrade path:** Pay-as-you-go. Llama 3.3 70B ~$0.59/M input tokens.
- **Throughput note:** 6,000 TPM shared across all calls. At 150 tokens/call
  (input + output), you get ~40 calls per minute before hitting the TPM cap.
- **Verdict:** **Top pick for production summarization** — best balance of rate
  limits, latency, privacy (ZDR), and zero cost to start.

##### OpenRouter (`:free` models)

| Metric                   | Free Tier                                                                        |
| ------------------------ | -------------------------------------------------------------------------------- |
| Requests/day             | 50 (200 after purchasing $10+ credits)                                           |
| RPM                      | 20                                                                               |
| Free models (~June 2026) | ~27 (Llama 3.1 8B, Gemini Flash 1.5, Mistral 7B, DeepSeek R1, Qwen 2.5 7B, etc.) |
| Card required            | No (free models only)                                                            |

- **Privacy:** OpenRouter does not train on prompts. ZDR routing available via
  `x-openrouter-no-cache` header or account setting — routes only to
  ZDR-certified providers.
- **Verdict:** 50 req/day is too low for any real workload. Useful for
  prototyping or infrequent background moderation.

##### Cloudflare Workers AI

| Metric        | Workers Free Plan                                            |
| ------------- | ------------------------------------------------------------ |
| Neurons/day   | 10,000                                                       |
| Card required | No                                                           |
| Relevant LLMs | Llama 3.3 70B Instruct, Llama 3.1 8B, Mistral 7B, Phi-3 Mini |

- **Neurons context:** Llama 3.1 8B call with ~200 tokens ≈ 500-1,000 neurons;
  10,000 neurons/day ≈ 10-20 calls/day. Very limited for production.
- **Upgrade path:** Workers Paid ($5/mo) gives unlimited neurons.
- **Verdict:** Only viable as a zero-cost fallback in a Cloudflare-native
  deployment.

##### Mistral (La Plateforme — Experiment Tier)

| Metric        | Free "Experiment" Tier           |
| ------------- | -------------------------------- |
| RPM           | 2                                |
| Tokens/month  | 1 billion                        |
| Card required | No (phone verification required) |

- **Privacy:** 30-day retention by default; zero-retention opt-in available.
- **Verdict:** The 2 RPM cap is a hard blocker for interactive or near-real-
  time use. Viable only for batched async jobs running < 1 req/30 s.

##### Together AI

| Metric        | Details                                                    |
| ------------- | ---------------------------------------------------------- |
| Free credits  | $25 at signup (verify current amount at sign-up)           |
| Ongoing free  | None — credits only, then pay-as-you-go                    |
| Models        | 200+ open-source (Llama, Mistral, DBRX, Qwen, etc.)        |
| Card required | No (to use initial credits); required after credits expire |

- **Privacy:** Not prominently documented; no confirmed ZDR for free tier.
- **Verdict:** Good for evaluating model quality for contract summarization; not
  a sustainable free tier once credits run out.

##### AI Provider Summary

| Provider              | Free RPD     | Free RPM | Card? | Privacy (free)               | Recommendation           |
| --------------------- | ------------ | -------- | ----- | ---------------------------- | ------------------------ |
| **Groq**              | 14,400       | 30       | No    | No training; ZDR available   | **Production (low-vol)** |
| Gemini 2.5 Flash      | 250          | 10       | No    | ⚠️ Used for training         | Dev/prototype only       |
| OpenRouter            | 50           | 20       | No    | ZDR routing available        | Prototyping only         |
| Mistral               | —            | 2        | No    | 30-day retention; ZDR opt-in | Batch jobs only          |
| Cloudflare Workers AI | ~10-20 calls | —        | No    | Edge processing              | CF-native projects       |
| Together AI           | — (credits)  | —        | No    | Unknown                      | Model evaluation         |

**Decision:** Use **Groq** (Llama 3.3 70B) for both contract summarization and
message moderation. Enable ZDR in Groq account settings before processing any
real user data. Fall back to Gemini Flash Tier 1 (paid) if daily volume exceeds
~10K requests. Wire through `src/services/aiSummary.ts` so the provider can be
swapped without touching call sites.

---

#### Email / Transactional (Magic-Link Authentication)

_Currently integrated: Resend (`src/services/email.ts`,
`src/services/notifications.ts`)._

##### Resend _(currently in use)_

| Metric         | Free Tier       |
| -------------- | --------------- |
| Monthly emails | 3,000           |
| Daily limit    | **100**         |
| Custom domains | 1               |
| Analytics      | Paid plans only |
| Card required  | No              |

- The 100/day daily cap is the binding constraint — a single launch spike can
  silently queue or drop auth emails.
- SDK and developer experience are excellent; React Email support is built in.

##### Brevo (formerly Sendinblue)

| Metric                | Free Tier         |
| --------------------- | ----------------- |
| Daily limit           | **300**           |
| Monthly equivalent    | ~9,000            |
| Card required         | No                |
| Transactional support | Yes (REST + SMTP) |

- Most generous daily free limit of any provider evaluated.
- Primarily a marketing platform; transactional and marketing emails share
  infrastructure (unlike Postmark's strict separation) — can affect
  deliverability.

##### Postmark

| Metric         | Free "Developer" Tier              |
| -------------- | ---------------------------------- |
| Monthly emails | **100** (permanent, never expires) |
| Daily limit    | None within monthly cap            |
| Card required  | No                                 |

- Best-in-class deliverability for transactional email; transactional-only
  platform (no marketing mix).
- 100/month is staging-only. Upgrade: $15/mo for 10,000 emails.

##### Mailgun

| Metric        | Free Tier |
| ------------- | --------- |
| Daily limit   | 100       |
| Log retention | 1 day     |
| Card required | No        |

- Free tier now permanent at 100/day (previous generous trial replaced).
- 1-day log retention limits debugging. Flex pay-as-you-go doubled to $2/1,000
  messages in December 2025.
- No meaningful advantage over Resend at the free tier.

##### SendGrid

| Status        | Note                          |
| ------------- | ----------------------------- |
| Free plan     | **Eliminated May 27, 2025**   |
| Current offer | 60-day trial (100 emails/day) |
| After trial   | From $19.95/month             |

- No longer viable as a free ongoing provider.

##### Email Provider Summary

| Provider               | Free Monthly | Free Daily | Card? | Deliverability | Verdict                  |
| ---------------------- | ------------ | ---------- | ----- | -------------- | ------------------------ |
| **Resend** _(current)_ | 3,000        | 100        | No    | Good           | Keep as primary          |
| **Brevo**              | ~9,000       | 300        | No    | Mixed          | Overflow/backup          |
| Postmark               | 100          | —          | No    | Best-in-class  | Staging; $15/mo for prod |
| Mailgun                | ~3,000       | 100        | No    | Good           | No advantage over Resend |
| SendGrid               | —            | —          | —     | Good           | Not free; skip           |

**Decision:** Keep **Resend** as primary sender. Add **Brevo** as a
secondary/overflow sender for launch-day spikes (100/day Resend cap is a
single-busy-day vulnerability). If deliverability becomes an issue in
production, budget for **Postmark** at $15/month — its strict transactional-only
infrastructure pays off in inbox placement for auth emails.

---

#### RPC / Blockchain Node Access

##### Alchemy

| Metric         | Free Tier                                                      |
| -------------- | -------------------------------------------------------------- |
| Compute Units  | 30 M CUs/month (~1 M CUs/day)                                  |
| Throughput     | 500 CUPs                                                       |
| Chains         | Ethereum, Sepolia, Base, Arbitrum, Polygon, Optimism, and more |
| Archive access | Included                                                       |
| Card required  | No                                                             |

- CU guide: `eth_getBalance` = 10 CUs; `eth_call` = 26 CUs; `eth_getLogs` = 75
  CUs. At ~30 CUs/call average, 1 M CUs/day ≈ 33,000 calls/day.
- Webhooks support is useful for monitoring on-chain escrow state changes
  without polling.
- Upgrade: pay-as-you-go ($1.50/M CUs) or Growth plan ($49/mo, 400 M CUs).

##### Infura

| Metric         | Free Tier                                                    |
| -------------- | ------------------------------------------------------------ |
| Credits/day    | 6,000,000                                                    |
| Throughput     | 2,000 credits/second                                         |
| Chains         | Ethereum, Sepolia, Base, Arbitrum, Linea, Optimism, StarkNet |
| Archive access | Included (same credit cost)                                  |
| Card required  | No                                                           |

- Credit guide: standard ETH JSON-RPC = 80 credits; `eth_getLogs` = 80;
  debug/trace = 1,000. At 80 credits/call, 6 M credits/day ≈ 75,000 standard
  calls/day — higher raw ceiling than Alchemy free tier.
- Upgrade: Developer plan $50/mo for 500 M credits/month.

##### QuickNode

| Metric      | Free Tier                        |
| ----------- | -------------------------------- |
| API credits | ~50 M (verify period at sign-up) |
| Chains      | 30+                              |

- Less well-documented free tier than Alchemy/Infura. Third-choice option.

##### Public / Community RPC Endpoints

| Network          | Endpoint                            | Notes                      |
| ---------------- | ----------------------------------- | -------------------------- |
| Ethereum Sepolia | `https://rpc.ankr.com/eth_sepolia`  | Global multi-node; no auth |
| Base             | `https://mainnet.base.org`          | Official; rate-limited     |
| Base Sepolia     | `https://rpc.ankr.com/base_sepolia` | Public, unauthenticated    |

- Use only in local dev and CI. A single `eth_getLogs` spike can exhaust a
  shared endpoint. Never use in production.

##### RPC Summary

| Provider    | Daily Calls (approx.)  | Archive | Sepolia | Base | Card? |
| ----------- | ---------------------- | ------- | ------- | ---- | ----- |
| **Alchemy** | ~33,000                | Yes     | Yes     | Yes  | No    |
| Infura      | ~75,000                | Yes     | Yes     | Yes  | No    |
| QuickNode   | ~50 M credits (verify) | Yes     | Yes     | Yes  | TBD   |
| Ankr public | Throttled, unlimited   | No      | Yes     | Yes  | No    |

**Decision:** **Alchemy** as primary RPC — best SDK, Webhooks support, archive
access, and cleanest documentation. Use Ankr public endpoints only in local
dev/CI.

---

#### IPFS / Storage Pinning

_Currently integrated: Pinata. See `NEXT_PUBLIC_PINATA_JWT` in `.env.example`._

##### Pinata _(currently in use)_

| Metric        | Free Tier     |
| ------------- | ------------- |
| Storage       | 1 GB          |
| Bandwidth     | 10 GB/month   |
| Files (pins)  | **500 total** |
| API requests  | 10,000/month  |
| Card required | No            |

- The 500-pin cap is the binding constraint if every contract or deliverable
  submission stores an IPFS file.

##### Filebase

| Metric        | Free Tier     |
| ------------- | ------------- |
| Storage       | 5 GB          |
| Pins          | **1,000**     |
| Egress        | 5 GB/month    |
| Card required | No            |
| API           | S3-compatible |

- S3-compatible API means the standard `@aws-sdk/client-s3` pointed at
  Filebase's endpoint works without a custom client — easy migration from
  Pinata.
- All objects automatically replicated 3× and pinned to IPFS.
- Upgrade: $5.99/month for 1 TB.

##### web3.storage / Storacha

| Metric        | Free Tier |
| ------------- | --------- |
| Storage       | 5 GiB     |
| Card required | No        |

- Rebranded to Storacha; shifted to a UCAN-based decentralized storage protocol
  backed by Filecoin. More storage than Pinata but meaningfully more complex to
  integrate.

##### IPFS Summary

| Provider                | Free Storage | Free Pins | Card? | API             |
| ----------------------- | ------------ | --------- | ----- | --------------- |
| **Pinata** _(current)_  | 1 GB         | 500       | No    | Pinata REST/SDK |
| **Filebase**            | 5 GB         | 1,000     | No    | S3-compatible   |
| Storacha (web3.storage) | 5 GiB        | Unlimited | No    | UCAN/W3 client  |

**Decision:** Stay on **Pinata** short-term (already integrated). Migrate to
**Filebase** when approaching the 500-pin or 1 GB limit — the S3 API makes it a
near-drop-in replacement. Storacha is worth revisiting if decentralized storage
becomes a product requirement.

---

#### Price / Oracle Data Feeds

##### CoinGecko API

| Metric        | Free Demo Tier                   |
| ------------- | -------------------------------- |
| Rate limit    | ~100 calls/min with Demo API key |
| Monthly cap   | 10,000 calls                     |
| Card required | No                               |
| ETH/USDC data | Yes                              |

- 10,000 calls/month ≈ 333 calls/day; sufficient for price polling every 5
  minutes (288 calls/day).
- Upgrade: Analyst $35/mo, 300 calls/min, 100,000 calls/month.

##### CoinMarketCap API

| Metric        | Free Basic Tier                           |
| ------------- | ----------------------------------------- |
| Credits/month | 10,000 (~333 calls/day at 1 credit/asset) |
| RPM           | 30                                        |
| Card required | No                                        |

- Comparable limits to CoinGecko Demo. CoinGecko preferred for developer
  experience.

##### Chainlink Data Feeds (On-Chain)

| Context                         | Cost                                                 |
| ------------------------------- | ---------------------------------------------------- |
| Testnet (Sepolia, Base Sepolia) | Free — gas only                                      |
| Mainnet (Ethereum, Base)        | Free to read — gas only (~5,000-20,000 gas per call) |

- Available feeds: ETH/USD (Sepolia, Base), USDC/USD (Sepolia, Base). No direct
  USDC/ETH pair — derive it by combining ETH/USD and USDC/USD feeds.
- Read via `latestRoundData()` on `AggregatorV3Interface`. No API key or auth.
- Staleness: mainnet ETH/USD updates every ~1 hour or on 0.5% price deviation.
  Always check `updatedAt` and revert if > 3,600 seconds stale.

##### Price Data Summary

| Provider            | Free Calls/month     | Rate Limit | On-chain? | Card? |
| ------------------- | -------------------- | ---------- | --------- | ----- |
| **CoinGecko**       | 10,000               | 100 RPM    | No        | No    |
| CoinMarketCap       | 10,000 (credits)     | 30 RPM     | No        | No    |
| **Chainlink Feeds** | Unlimited (gas only) | —          | **Yes**   | No    |

**Decision:** Dual approach — **Chainlink Data Feeds** for any on-chain price
references inside smart contracts (escrow valuation, milestone calculations),
**CoinGecko Demo API** for off-chain dashboard display (USD conversion, price
history). This keeps the trust-critical path fully decentralized.

---

#### Overall Recommendations Summary

| Category                    | Primary                | Backup / Migration Path             |
| --------------------------- | ---------------------- | ----------------------------------- |
| AI summarization/moderation | **Groq** (ZDR enabled) | Gemini Flash Tier 1 (paid) at scale |
| Email (magic links)         | **Resend** (keep)      | **Brevo** for launch-day overflow   |
| RPC                         | **Alchemy**            | Infura (higher daily call ceiling)  |
| IPFS pinning                | **Pinata** (keep)      | **Filebase** at 500-pin limit       |
| Price data (on-chain)       | **Chainlink**          | —                                   |
| Price data (dashboard)      | **CoinGecko Demo API** | CoinMarketCap                       |

---

## Decisions

<!-- Notable choices and the reasoning behind them. -->

### Supabase Evaluation (2026-06-08)

**Recommendation:** Do **not** make Supabase a core dependency for the current
TrustLedger architecture. Adopt it only when Phase 6 needs a real off-chain
account and notification database. The current app can keep shipping with wallet
authentication, on-chain escrow state, Resend for email, Pinata/Arweave for
documents, and provider-specific services for RPC, AI, and price data.

#### Features That Would Benefit From Supabase

| Supabase capability | TrustLedger fit                                                                                                                                             | Recommendation                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Postgres database   | Strong fit for wallet-address profiles, address-to-email mappings, notification preferences, contract watchlists, audit metadata, and indexed event caches. | Adopt in Phase 6 if these records outgrow `NOTIFICATION_EMAILS` and event-log reads.            |
| Auth                | Partial fit. TrustLedger already uses wallet ownership and signed magic links; Supabase Auth would add another identity system.                             | Skip for core escrow flows. Consider only for optional email/password admin or support tooling. |
| Storage             | Weak fit. Contract and proof files need content-addressed, portable storage; Pinata/IPFS and Arweave already match that requirement.                        | Do not replace Pinata/Arweave.                                                                  |
| Realtime            | Useful for dashboards if the app introduces off-chain event indexing or live notification status.                                                           | Defer until there is a Supabase-backed event table to stream from.                              |
| Edge Functions      | Useful for email fanout, webhook ingestion, and scheduled jobs, but Vercel API routes and cron already cover the current needs.                             | Keep on Vercel for now; revisit if backend logic becomes Supabase-centric.                      |

#### Comparison Against Current Architecture

- **Current source of truth:** Escrow lifecycle, funds, ratings, juror state,
  and dispute outcomes live on-chain. Supabase should not become authoritative
  for any trust-critical state.
- **Current authentication:** Wallet connection plus HMAC magic links are enough
  for contract acceptance and review. Supabase Auth would duplicate identity
  without removing wallet-signature requirements.
- **Current storage:** Contract files and proof of work are pinned to IPFS via
  Pinata, with Arweave available for permanent storage. Supabase Storage is not
  content-addressed and would weaken portability for documents referenced by
  on-chain hashes or URIs.
- **Current backend:** Vercel API routes already send magic links and lifecycle
  notifications through Resend. Supabase Edge Functions would add another
  runtime unless the project also adopts Supabase Postgres.
- **Current gap:** Deadline reminders currently rely on a JSON address-to-email
  map in `NOTIFICATION_EMAILS`. That is the strongest reason to add a database
  later.

#### If Supabase Is Adopted

Supabase should be responsible for:

- Wallet-address profiles: address, verified email, display name, locale, and
  notification preferences.
- Notification routing: durable replacement for `NOTIFICATION_EMAILS`, opt-out
  state, bounce state, and last-sent timestamps.
- Optional off-chain indexes: cached contract event summaries, user watchlists,
  and dashboard filters that can always be rebuilt from chain data.
- Optional realtime dashboard feeds backed by the event/index tables.

Supabase should **not** be responsible for:

- Escrow balances, contract status, dispute rulings, ratings, juror eligibility,
  or any final settlement logic.
- Storing canonical contract/proof documents that are referenced on-chain.
- Replacing wallet checks for actions that require the client, freelancer, or
  juror address to sign a transaction.
- RPC access, AI summarization/moderation, oracle reads, or email delivery.

#### Trade-Offs

- **Implementation complexity:** Low to moderate if limited to profiles and
  notifications. High if the app tries to mirror all chain state; that would
  require event ingestion, replay, reorg handling, and reconciliation.
- **Costs:** Supabase's Free plan includes 50,000 monthly active users, 500 MB
  database size, 1 GB file storage, 5 GB egress, 2 million realtime messages,
  200 realtime peak connections, and 500,000 Edge Function invocations, but free
  projects pause after one week of inactivity. Production should assume the Pro
  plan starts at $25/month, with 100,000 MAU, 8 GB database disk, 250 GB egress,
  100 GB file storage, daily backups, and paid overages. Current pricing source:
  [Supabase Pricing](https://supabase.com/pricing), checked 2026-06-08.
- **Vendor lock-in:** Moderate. Postgres schemas and SQL are portable, but Auth,
  Realtime, Storage policies, Edge Functions, and row-level-security conventions
  create platform coupling. Keep schema migrations in-repo and isolate Supabase
  calls behind service modules if adopted.
- **Security implications:** Positive if row-level security is carefully tested
  for profile and notification data. Negative if Supabase data is treated as
  authoritative for funds or contract rights. Service-role keys must stay
  server-only; never expose them through `NEXT_PUBLIC_*`.
- **Maintainability:** Good when Supabase owns a narrow off-chain domain.
  Maintainability worsens if contributors must reason about three sources of
  truth: chain state, local frontend state, and database mirrors.

**Decision:** Defer Supabase for now. Revisit during Phase 6 and adopt it only
for off-chain profiles, notification preferences, and rebuildable event indexes.
The database should support user experience, not replace the blockchain-backed
contract state.

## Technical Debt

<!--
Packages, patterns, or code that could not be updated or improved yet, and why,
so future contributors are aware of the trade-offs. (For example, dependencies
left at older versions because of deprecation or lack of maintenance.)
-->

## Open Questions

<!-- Things still being figured out. -->
