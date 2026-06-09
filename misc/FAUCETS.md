# Sepolia ETH Faucets

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Updated: 2026-06-09.

Use this page when you need test ETH for Ethereum Sepolia (`chainId`
`11155111`). Sepolia ETH has no real value, but it is still rate limited because
public faucets are abused heavily.

## Recommended Faucets

| Faucet            | URL                                                                 | What To Expect                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alchemy           | <https://www.alchemy.com/faucets/ethereum-sepolia>                  | Usually requires an Alchemy account or human verification. Current Alchemy pages advertise `0.1` Sepolia ETH per day for the faucet. Older third-party guides may still mention `0.5`; treat the live faucet UI as authoritative. |
| Infura            | <https://www.infura.io/faucet/sepolia>                              | Requires an Infura account. The page may show capacity warnings during heavy demand.                                                                                                                                              |
| Google Cloud Web3 | <https://cloud.google.com/application/web3/faucet/ethereum/sepolia> | Requires a Google account. Good fallback when provider faucets are depleted.                                                                                                                                                      |
| Chainlink         | <https://faucets.chain.link/sepolia>                                | Wallet-connect flow for testnet tokens. Availability, token choices, and anti-abuse checks can change.                                                                                                                            |
| QuickNode         | <https://faucet.quicknode.com/ethereum/sepolia>                     | May require login, wallet ownership checks, or social/human verification depending on current abuse controls.                                                                                                                     |
| Sepolia PoW       | <https://sepolia-faucet.pk910.de>                                   | Browser proof-of-work faucet. Useful when account-gated faucets fail, but it can be slow and CPU intensive.                                                                                                                       |

## Before You Request Funds

1. Verify your wallet address starts with `0x` and is 42 characters long.
2. Confirm the faucet is set to **Ethereum Sepolia**, not Base Sepolia, Arbitrum
   Sepolia, Holesky, or Linea.
3. Add Sepolia to your wallet if it is hidden under test networks.
4. Check whether you already requested from the same faucet today.
5. Use a funded RPC provider URL for deployment scripts. Public RPC URLs are
   fine for quick reads, but unreliable for deploys and fork tests.

## Sepolia Block Explorers

- Etherscan: <https://sepolia.etherscan.io>
- Blockscout: <https://eth-sepolia.blockscout.com>

## Public RPC Endpoints

These are rate-limited and not suitable for CI, deployment, or long-running
scripts:

```text
https://rpc.sepolia.org
https://ethereum-sepolia-rpc.publicnode.com
```

Prefer an authenticated RPC endpoint for TrustLedger:

```text
https://eth-sepolia.g.alchemy.com/v2/<key>
https://sepolia.infura.io/v3/<key>
```

## Troubleshooting

| Symptom                                           | Likely Cause                                                            | Fix                                                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Faucet says "unsupported network"                 | Wallet is connected to another chain.                                   | Switch MetaMask or your wallet to Ethereum Sepolia and retry.                                 |
| Faucet says "rate limited" or "already requested" | Daily quota or anti-abuse rule was hit.                                 | Wait for the reset window or try a different faucet. Do not spam requests.                    |
| Faucet shows "capacity" or no transaction hash    | Faucet wallet is empty or congested.                                    | Try Google Cloud, Alchemy, Infura, or Sepolia PoW.                                            |
| Funds sent but wallet balance is unchanged        | Wallet is showing the wrong network or stale cache.                     | Open the address on Sepolia Etherscan and refresh the wallet network.                         |
| Deployment fails with insufficient funds          | Faucet amount was too small for current gas or wrong wallet was funded. | Run `npm run hardhat:check-balance` or `cast balance <address> --rpc-url "$SEPOLIA_RPC_URL"`. |
| `nonce too low` or stuck deployment               | A previous tx is pending from the same wallet.                          | Check the wallet on Sepolia Etherscan and speed up/cancel the pending tx.                     |
| `could not detect network`                        | RPC URL is wrong, missing, or rate limited.                             | Confirm `SEPOLIA_RPC_URL` and run `cast chain-id --rpc-url "$SEPOLIA_RPC_URL"`.               |

## TrustLedger Commands

```bash
# Check deployer balance on Sepolia.
npm run hardhat:check-balance

# Verify an RPC endpoint.
cast chain-id --rpc-url "$SEPOLIA_RPC_URL"

# Verify an address balance.
cast balance "$DEPLOYER_PUBLIC_ADDRESS" --ether --rpc-url "$SEPOLIA_RPC_URL"
```

Do not paste private keys into faucet websites. Faucets only need your public
wallet address.
