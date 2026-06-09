#!/usr/bin/env bash
# Print safe Foundry cast examples for manually driving TrustLedger.
#
# This script does not send transactions. It validates the local environment and
# prints copy-pasteable commands with the addresses you exported.

set -euo pipefail

VERBOSE=0
NETWORK="sepolia"

usage() {
    cat <<'USAGE'
Print safe Foundry cast examples for manually driving TrustLedger.

This script does not send transactions. It validates the local environment and
prints copy-pasteable commands with the addresses you exported.

Usage:
  RPC=https://... TRUSTLEDGER=0x... PRIVATE_KEY=0x... bash misc/cast-cheatsheet.sh
  bash misc/cast-cheatsheet.sh --network localhost --verbose

Environment:
  RPC           JSON-RPC URL. Required for all commands.
  TRUSTLEDGER   Deployed TrustLedger address.
  REPUTATION    Optional ReputationRegistry address.
  PRIVATE_KEY   Optional signer private key. Required only for cast send commands.
USAGE
}

log() { printf '%s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die() { printf 'cast-cheatsheet: %s\n' "$*" >&2; exit 1; }
debug() { [[ "$VERBOSE" -eq 1 ]] && printf 'debug: %s\n' "$*" >&2; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        --network)
            shift
            [[ $# -gt 0 ]] || die "--network requires a value"
            NETWORK="$1"
            ;;
        --verbose|-v) VERBOSE=1 ;;
        --help|-h) usage; exit 0 ;;
        *) die "unknown option '$1' (use --help)" ;;
    esac
    shift
done

RPC="${RPC:-}"
PRIVATE_KEY="${PRIVATE_KEY:-}"
TRUSTLEDGER="${TRUSTLEDGER:-}"
REPUTATION="${REPUTATION:-}"

command -v cast >/dev/null 2>&1 || die "Foundry cast is not installed. Install Foundry, then run foundryup."
[[ -n "$RPC" ]] || die "RPC is required. Example: export RPC=https://eth-sepolia.g.alchemy.com/v2/<key>"
[[ -n "$TRUSTLEDGER" ]] || die "TRUSTLEDGER is required. Use the deployed TrustLedger address."
cast wallet address --private-key "${PRIVATE_KEY:-0x59c6995e998f97a5a004497e5d9b6a7fbd24aae79895f3a1eb73c61bd0f00}" >/dev/null 2>&1 || {
    [[ -z "$PRIVATE_KEY" ]] || die "PRIVATE_KEY is not a valid private key."
}
cast --to-checksum-address "$TRUSTLEDGER" >/dev/null 2>&1 || die "TRUSTLEDGER is not a valid EVM address."
if [[ -n "$REPUTATION" ]]; then
    cast --to-checksum-address "$REPUTATION" >/dev/null 2>&1 || die "REPUTATION is not a valid EVM address."
fi

debug "network=$NETWORK"
debug "rpc=$RPC"

if ! cast chain-id --rpc-url "$RPC" >/dev/null 2>&1; then
    warn "RPC did not respond. Commands below may fail until the endpoint, API key, or network is fixed."
fi

if [[ -z "$PRIVATE_KEY" ]]; then
    warn "PRIVATE_KEY is not set. Read-only commands work; cast send examples need a signer."
fi

printf -v RPC_Q "%q" "$RPC"
printf -v TRUSTLEDGER_Q "%q" "$TRUSTLEDGER"
printf -v REPUTATION_Q "%q" "$REPUTATION"

cat <<EOF
# TrustLedger cast examples ($NETWORK)

export RPC=$RPC_Q
export TRUSTLEDGER=$TRUSTLEDGER_Q
export PRIVATE_KEY=${PRIVATE_KEY:-0xYOUR_PRIVATE_KEY}

# Read a full escrow struct by ID.
cast call "\$TRUSTLEDGER" \\
  "getContract(uint256)(address,address,bytes32,string,uint256,uint256,uint256,uint8,uint16,uint16,uint64,bytes32,string,address,uint256,uint256,uint256,bool,bool)" \\
  1 --rpc-url "\$RPC"

# Freelancer proposes an ETH escrow. Client funds later with acceptContract.
cast send "\$TRUSTLEDGER" \\
  "proposeContract(address,bytes32,string,uint256,uint256,uint256,uint16,uint16,uint64,address,uint256)" \\
  0xCLIENT_ADDRESS 0xCONTRACT_HASH "ipfs://QmContractCid" \\
  \$((30 * 24 * 3600)) 1200 \$((2 * 24 * 3600)) 1000 0 0 \\
  0x0000000000000000000000000000000000000000 1000000000000000000 \\
  --private-key "\$PRIVATE_KEY" --rpc-url "\$RPC"

# Client accepts and funds a freelancer-proposed ETH escrow.
cast send "\$TRUSTLEDGER" "acceptContract(uint256)" 1 \\
  --value 1ether --private-key "\$PRIVATE_KEY" --rpc-url "\$RPC"

# Client rejects a pending freelancer proposal.
cast send "\$TRUSTLEDGER" "rejectContract(uint256)" 1 \\
  --private-key "\$PRIVATE_KEY" --rpc-url "\$RPC"

# Freelancer cancels a pending freelancer proposal.
cast send "\$TRUSTLEDGER" "cancelProposal(uint256)" 1 \\
  --private-key "\$PRIVATE_KEY" --rpc-url "\$RPC"

# Client proposes an escrow. Freelancer accepts, then client funds.
cast send "\$TRUSTLEDGER" \\
  "proposeContractByClient(address,bytes32,string,uint256,uint256,uint256,uint16,uint16,uint64,address,uint256)" \\
  0xFREELANCER_ADDRESS 0xCONTRACT_HASH "ipfs://QmContractCid" \\
  \$((30 * 24 * 3600)) 1200 \$((2 * 24 * 3600)) 1000 0 0 \\
  0x0000000000000000000000000000000000000000 1000000000000000000 \\
  --private-key "\$PRIVATE_KEY" --rpc-url "\$RPC"

cast send "\$TRUSTLEDGER" "acceptContractByFreelancer(uint256)" 1 \\
  --private-key "\$PRIVATE_KEY" --rpc-url "\$RPC"

cast send "\$TRUSTLEDGER" "fundContractByClient(uint256)" 1 \\
  --value 1ether --private-key "\$PRIVATE_KEY" --rpc-url "\$RPC"

# Freelancer submits proof of work.
cast send "\$TRUSTLEDGER" "submitProofOfWork(uint256,bytes32,string)" \\
  1 0xPROOF_HASH "ipfs://QmDeliverableCid" \\
  --private-key "\$PRIVATE_KEY" --rpc-url "\$RPC"

# Client approves, disputes, or claims after a missed deadline.
cast send "\$TRUSTLEDGER" "approveWork(uint256)" 1 --private-key "\$PRIVATE_KEY" --rpc-url "\$RPC"
cast send "\$TRUSTLEDGER" "disputeWork(uint256)" 1 --private-key "\$PRIVATE_KEY" --rpc-url "\$RPC"
cast send "\$TRUSTLEDGER" "claimAfterDeadlineMiss(uint256)" 1 --private-key "\$PRIVATE_KEY" --rpc-url "\$RPC"

# Freelancer claims after acceptance window or warranty period.
cast send "\$TRUSTLEDGER" "claimAfterAcceptanceWindow(uint256)" 1 --private-key "\$PRIVATE_KEY" --rpc-url "\$RPC"
cast send "\$TRUSTLEDGER" "claimWarrantyFunds(uint256)" 1 --private-key "\$PRIVATE_KEY" --rpc-url "\$RPC"

# Either party submits a post-completion rating.
cast send "\$TRUSTLEDGER" "submitRating(uint256,uint8)" 1 85 \\
  --private-key "\$PRIVATE_KEY" --rpc-url "\$RPC"
EOF

if [[ -n "$REPUTATION" ]]; then
    cat <<EOF

# Reputation reads.
export REPUTATION=$REPUTATION_Q
cast call "\$REPUTATION" "averageRating(address)(uint256,uint256)" 0xUSER_ADDRESS --rpc-url "\$RPC"
cast call "\$REPUTATION" "recoveryStatus(address)(uint256,uint256)" 0xUSER_ADDRESS --rpc-url "\$RPC"
EOF
fi

log ""
log "Tip: if a send fails, rerun with -vvvv and verify the wallet is on chain ID $(cast chain-id --rpc-url "$RPC" 2>/dev/null || printf 'unknown')."
