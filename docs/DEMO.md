# Demo Assets

Reusable assets for demoing TrustLedger live.

## Sample Contract Document

`demo/sample-contract.pdf` is a dummy freelance service agreement you can upload
as the **Contract Document** when creating an escrow. On creation, TrustLedger
stores the file's `keccak256` hash on-chain (`contractHash`) and pins the file to
IPFS (`contractURI`). Any later edit to the file changes the hash and fails the
on-chain match — demonstrating on-chain proof of agreement.

- Fictional parties and values; **not a legally binding contract**.
- Terms mirror the protocol: 1.00 ETH escrow, 5% arbitration fee, 10%/30-day
  warranty hold-back, 48-hour acceptance window.

## Regenerating the PDF

The PDF is produced by `demo/generate_contract.py` (uses
[`reportlab`](https://pypi.org/project/reportlab/)). Edit the script to change
parties, amounts, or clauses, then regenerate.

```bash
# from the project root
pip install -r demo/requirements.txt
python3 demo/generate_contract.py
# → writes demo/sample-contract.pdf
```

## Using It in a Demo

1. Open the frontend and connect a wallet on Ethereum Sepolia.
2. Start **Create a Contract**.
3. Under **Contract Document**, upload `demo/sample-contract.pdf` (or paste an
   IPFS URI).
4. Fill in the freelancer address and escrow amount, then create the contract.
5. The stored `contractHash` now binds the exact bytes of the PDF on-chain.
