#!/usr/bin/env bash
# Foundry cast one-liners for manually driving TrustLedger on Sepolia.
# Requires: forge/cast installed, PRIVATE_KEY and CONTRACT exported in your shell.
#
# Usage:
#   export PRIVATE_KEY=0x...
#   export TRUSTLEDGER=0x...          # from artifacts/deployed-addresses.json
#   export REPUTATION=0x...
#   export RPC=https://eth-sepolia.g.alchemy.com/v2/<key>
#   bash misc/cast-cheatsheet.sh      # (or copy-paste individual commands)

set -euo pipefail

RPC="${RPC:-}"
PRIVATE_KEY="${PRIVATE_KEY:-}"
TRUSTLEDGER="${TRUSTLEDGER:-}"
REPUTATION="${REPUTATION:-}"

# ─── Read contract state ──────────────────────────────────────────────────────

# Get a full escrow struct by ID (replace 1 with your contract ID)
cast call "$TRUSTLEDGER" "getContract(uint256)(address,address,bytes32,string,uint256,uint256,uint256,uint8,uint16,uint16,uint64,bytes32,string,address,uint256,uint256)" 1 --rpc-url "$RPC"

# Get reputation score for an address (returns numerator, denominator; average = n/d)
cast call "$REPUTATION" "averageRating(address)(uint256,uint256)" 0xYOUR_ADDRESS --rpc-url "$RPC"

# Get recovery status for an address
cast call "$REPUTATION" "recoveryStatus(address)(uint256,uint256)" 0xYOUR_ADDRESS --rpc-url "$RPC"

# ─── Client: create a contract (ETH escrow) ───────────────────────────────────
#
# createContract(
#   freelancer        address   - freelancer wallet
#   contractHash      bytes32   - keccak256 of the off-chain contract PDF
#   contractURI       string    - IPFS URI to the contract document
#   estimatedDuration uint256   - project duration in seconds
#   bufferFactor      uint256   - deadline multiplier × 1000 (e.g. 1500 = 1.5×)
#   acceptanceWindow  uint256   - seconds client has to approve after submission
#   arbitrationFeeBps uint16    - arbitration fee in bps (e.g. 500 = 5%)
#   holdBackBps       uint16    - warranty holdback in bps (e.g. 1000 = 10%)
#   warrantyPeriod    uint64    - warranty duration in seconds after approval
#   token             address   - ERC-20 token address, or 0x00…00 for ETH
#   tokenAmount       uint256   - token amount (0 for ETH escrow)
# )
# --value is the ETH escrow amount (omit / set to 0 for ERC-20)

FREELANCER=0xFREELANCER_ADDRESS
CONTRACT_HASH=$(cast keccak "$(cat /path/to/contract.pdf)")  # or a known hash
CONTRACT_URI="ipfs://QmYOUR_CID"
ESTIMATED_DURATION=$((30 * 24 * 3600))   # 30 days in seconds
BUFFER_FACTOR=1500                         # 1.5× deadline buffer
ACCEPTANCE_WINDOW=$((3 * 24 * 3600))      # 3 days
ARBITRATION_FEE_BPS=500                    # 5%
HOLD_BACK_BPS=1000                         # 10% warranty holdback
WARRANTY_PERIOD=$((7 * 24 * 3600))        # 7 days

cast send "$TRUSTLEDGER" \
  "createContract(address,bytes32,string,uint256,uint256,uint256,uint16,uint16,uint64,address,uint256)" \
  "$FREELANCER" "$CONTRACT_HASH" "$CONTRACT_URI" \
  "$ESTIMATED_DURATION" "$BUFFER_FACTOR" "$ACCEPTANCE_WINDOW" \
  "$ARBITRATION_FEE_BPS" "$HOLD_BACK_BPS" "$WARRANTY_PERIOD" \
  "0x0000000000000000000000000000000000000000" 0 \
  --value 0.1ether \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC"

# ─── Client: cancel a pending contract ────────────────────────────────────────

cast send "$TRUSTLEDGER" "cancelPending(uint256)" 1 \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC"

# ─── Freelancer: sign acceptance (generate v, r, s off-chain) ────────────────
#
# The contract requires an EIP-191 personal_sign over keccak256(contractId, freelancerAddress).
# Cast can produce this signature for testing:

CONTRACT_ID=1
FREELANCER_ADDR=0xFREELANCER_ADDRESS

INNER_HASH=$(cast keccak "$(cast abi-encode '(uint256,address)' "$CONTRACT_ID" "$FREELANCER_ADDR")")
# Note: acceptContract uses raw abi.encodePacked, not ABI-encoded. Use Python for exact hash:
# python3 -c "from eth_abi.packed import encode_packed; from eth_utils import keccak; print(keccak(encode_packed(['uint256','address'],[$CONTRACT_ID,'$FREELANCER_ADDR'])).hex())"

SIG=$(cast wallet sign --private-key "$PRIVATE_KEY" "$INNER_HASH")
V=$(echo "$SIG" | cut -c131-132)  # last byte as hex
R="0x$(echo "$SIG" | cut -c3-66)"
S="0x$(echo "$SIG" | cut -c67-130)"

# ─── Freelancer: accept contract ──────────────────────────────────────────────

cast send "$TRUSTLEDGER" "acceptContract(uint256,uint8,bytes32,bytes32)" \
  "$CONTRACT_ID" "$((16#$V))" "$R" "$S" \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC"

# ─── Freelancer: reject contract ──────────────────────────────────────────────

cast send "$TRUSTLEDGER" "rejectContract(uint256)" 1 \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC"

# ─── Freelancer: submit proof of work ─────────────────────────────────────────

POW_HASH=$(cast keccak "$(cat /path/to/deliverable.zip)")
POW_URI="ipfs://QmDELIVERABLE_CID"

cast send "$TRUSTLEDGER" "submitProofOfWork(uint256,bytes32,string)" \
  1 "$POW_HASH" "$POW_URI" \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC"

# ─── Client: approve work ─────────────────────────────────────────────────────

cast send "$TRUSTLEDGER" "approveWork(uint256)" 1 \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC"

# ─── Client: dispute work (attaches arbitration fee in ETH) ──────────────────

cast send "$TRUSTLEDGER" "disputeWork(uint256)" 1 \
  --value 0.005ether \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC"

# ─── Freelancer: claim after acceptance window elapses ────────────────────────

cast send "$TRUSTLEDGER" "claimAfterAcceptanceWindow(uint256)" 1 \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC"

# ─── Either party: claim after project deadline miss ──────────────────────────

cast send "$TRUSTLEDGER" "claimAfterDeadlineMiss(uint256)" 1 \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC"

# ─── Freelancer: claim warranty holdback after warranty period ────────────────

cast send "$TRUSTLEDGER" "claimWarrantyFunds(uint256)" 1 \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC"

# ─── Either party: submit rating after completion ─────────────────────────────
# score: 1-100

cast send "$TRUSTLEDGER" "submitRating(uint256,uint8)" 1 85 \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC"

# ─── Decode a tx receipt ──────────────────────────────────────────────────────

cast receipt 0xTX_HASH --rpc-url "$RPC"
cast logs --address "$TRUSTLEDGER" --rpc-url "$RPC" --from-block latest
