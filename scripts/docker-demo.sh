#!/usr/bin/env bash
# Entrypoint for the TrustLedger demo container.
#
# Starts the Hardhat node in the background, waits until it is ready,
# deploys all contracts, then runs the demo selected by the DEMO env var.
#
#   DEMO=good    happy path demo  (default)
#   DEMO=bad     dispute-flow demo
#   DEMO=jurors     juror reputation demo
#   DEMO=stablecoin ERC-20 escrow + gas comparison + reputation
#   DEMO=both       good then bad
#   DEMO=node    node only - useful for connecting MetaMask or Remix IDE
set -euo pipefail

NODE_URL="${NODE_URL:-http://127.0.0.1:8545}"
NODE_LOG="${NODE_LOG:-/tmp/trustledger-docker-node.log}"
VERBOSE="${VERBOSE:-0}"
NODE_PID=""

log() { echo "$*"; }
die() { echo "docker-demo: $*" >&2; exit 1; }
debug() { [[ "$VERBOSE" == "1" ]] && echo "debug: $*" >&2; }
usage() {
    cat <<'USAGE'
Usage: DEMO=<mode> bash scripts/docker-demo.sh

Modes:
  good        Happy-path escrow demo.
  bad         Dispute-flow demo.
  jurors      Juror reputation demo.
  stablecoin  ERC-20 escrow demo.
  both        Run good and bad demos.
  node        Start local Hardhat node only.

Environment:
  NODE_URL    JSON-RPC health URL. Default: http://127.0.0.1:8545
  NODE_LOG    Hardhat node log path. Default: /tmp/trustledger-docker-node.log
  VERBOSE=1   Enable debug messages.
USAGE
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    usage
    exit 0
fi

cleanup() {
    if [[ -n "${NODE_PID:-}" ]]; then
        kill "$NODE_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

command -v curl >/dev/null 2>&1 || die "curl is required in the container image."
command -v npm >/dev/null 2>&1 || die "npm is required in the container image."

# ── Start the Hardhat node in the background ──────────────────────────────────
npm run node > "$NODE_LOG" 2>&1 &
NODE_PID=$!
debug "node pid=$NODE_PID log=$NODE_LOG"

log ""
log "Waiting for Hardhat node at $NODE_URL..."
for _ in $(seq 1 80); do
    if curl -sf -X POST "$NODE_URL" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    > /dev/null 2>&1; then
        log "Node ready."
        log ""
        break
    fi
    sleep 0.5
done

if ! curl -sf -X POST "$NODE_URL" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' >/dev/null 2>&1; then
    die "Hardhat node did not become ready. Check $NODE_LOG"
fi

# ── Run the requested demo ────────────────────────────────────────────────────
case "${DEMO:-good}" in
    good)
        log "Deploying contracts..."
        npm run hardhat:deploy:local
        log ""
        log "Running happy-path demo (create, accept, submit, approve, payout)..."
        npm run demo:good
        ;;
    bad)
        log "Deploying contracts..."
        npm run hardhat:deploy:local
        log ""
        log "Running dispute-flow demo (create, accept, submit, dispute, vote, ruling)..."
        npm run demo:bad
        ;;
    jurors)
        log "Deploying contracts..."
        npm run hardhat:deploy:local
        log ""
        log "Running juror reputation demo (register, vote, minority slash, before/after table)..."
        npm run demo:jurors
        ;;
    stablecoin)
        log "Deploying contracts..."
        npm run hardhat:deploy:local
        log ""
        echo "Running stablecoin escrow demo (ERC-20 escrow + gas comparison + reputation)..."
        npm run demo:stablecoin
        ;;
    both)
        log "Deploying contracts..."
        npm run hardhat:deploy:local
        log ""
        log "Running happy-path demo..."
        npm run demo:good
        log ""
        log "Running dispute-flow demo..."
        npm run demo:bad
        ;;
    node)
        log "Hardhat node is running at $NODE_URL (chain ID 31337)."
        log "Read $NODE_LOG for local account private keys, then import one into MetaMask if needed."
        log "Press Ctrl+C to stop."
        wait "$NODE_PID"
        exit 0
        ;;
    *)
        die "Unknown DEMO='${DEMO}'. Valid values: good | bad | jurors | stablecoin | both | node"
        ;;
esac

log ""
log "Demo complete. Node is still running at $NODE_URL."
log "Press Ctrl+C to stop."
wait "$NODE_PID"
