# Arbitration Flow

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../CREDITS.md).

1. Client disputes submitted work in TrustLedger.
2. TrustLedger forwards the fee pool to Arbitration and records the dispute ID.
3. Client and freelancer submit evidence summaries plus off-chain evidence URIs.
4. Selected jurors review the evidence, commit hidden votes, and reveal them.
5. Arbitration finalizes the median ruling and exposes reward/appeal actions.
6. After the appeal window, the ruling executes back into TrustLedger.
