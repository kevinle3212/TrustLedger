# Product

## Register

product

## Users

Mainstream freelancers and clients who are familiar with platforms like Upwork
or Fiverr but new to Web3. They may not own a wallet yet or understand gas fees.
Their context when opening the app: they are mid-flow on a specific task (create
a contract, check payment status, respond to a dispute) and are already feeling
some friction from the crypto requirement. The interface cannot assume Web3
literacy; it must guide, not gate.

Secondary audience: jurors (crypto-native, staking capital to arbitrate
disputes) and Oregon Blockchain Group evaluators (portfolio/demo context).

## Product Purpose

TrustLedger holds escrow funds in a smart contract on Ethereum. A client locks
ETH or ERC-20 tokens; the freelancer completes work; funds release on approval
or via a staked juror panel if there is a dispute. The product eliminates
counter-party trust from freelance agreements without requiring either party to
trust TrustLedger itself.

Success looks like: a freelancer and client can complete the full contract
lifecycle (propose, fund, submit, approve or dispute) without needing to read
any documentation.

## Brand Personality

Professional, accessible, credible.

Voice: direct and explanatory without being condescending. It speaks to someone
doing real financial work, not someone buying into a hype narrative. Errors
explain what went wrong and what to do next. Empty states teach the workflow.
Labels name things plainly.

## Anti-references

- Crypto hype UIs: neon gradients on dark backgrounds, aggressive coin/rocket
  imagery, excessive animation as decoration. TrustLedger is a financial tool,
  not a trading dashboard.
- Friendly SaaS pastels (Notion, Loom aesthetic): too casual for a product
  handling real money. Colors and weight must communicate that real value is at
  stake.
- Opaque DeFi UIs that assume the user knows what a gas limit is.

## Design Principles

1. **Clarity over cleverness.** Every label, heading, and CTA should be
   understood on first read by someone who is new to Web3. Technical terms are
   explained where they appear, not in a separate glossary.
2. **State is never ambiguous.** Contract status, transaction pending state,
   wallet connection state, error conditions: each has a distinct, unambiguous
   visual treatment. A user should never have to guess what the system is doing.
3. **The interface disappears into the task.** No decorative motion, no
   gratuitous color, no display-font labels. Consistency across every screen so
   the product fades into the workflow and the user's attention stays on the
   contract, not the UI.
4. **Real money, real weight.** Destructive or irreversible actions (funding,
   approving, cancelling) require explicit confirmation. Visual weight and color
   reflect consequence: approving a payout looks different from cancelling a
   contract.
5. **Progressive disclosure for Web3 complexity.** Gas fees, wallet addresses,
   and commit-reveal mechanics surface only when needed and with a plain-English
   explanation. Power users can access detail; newcomers are not forced through
   it.

## Accessibility & Inclusion

WCAG AA minimum throughout. All color-conveyed state information (contract
status badges, error/success indicators, action buttons) has a non-color
fallback: icon, label, or shape. Palette verified at 4.5:1 body text contrast
and 3:1 for large/bold text. Reduced-motion preference already honored globally
in `globals.scss`.
