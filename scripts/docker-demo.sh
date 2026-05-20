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
#   DEMO=node    node only — useful for connecting MetaMask or Remix IDE
set -euo pipefail

cleanup() {
    kill "$NODE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ── Start the Hardhat node in the background ──────────────────────────────────
npm run node &
NODE_PID=$!

echo ""
echo "Waiting for Hardhat node at http://localhost:8545..."
until curl -sf -X POST http://127.0.0.1:8545 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    > /dev/null 2>&1
do
    sleep 0.5
done
echo "Node ready."
echo ""

# ── Run the requested demo ────────────────────────────────────────────────────
case "${DEMO:-good}" in
    good)
        echo "Deploying contracts..."
        npm run hardhat:deploy:local
        echo ""
        echo "Running happy-path demo (create → accept → submit → approve → payout)..."
        npm run demo:good
        ;;
    bad)
        echo "Deploying contracts..."
        npm run hardhat:deploy:local
        echo ""
        echo "Running dispute-flow demo (create → accept → submit → dispute → vote → ruling)..."
        npm run demo:bad
        ;;
    jurors)
        echo "Deploying contracts..."
        npm run hardhat:deploy:local
        echo ""
        echo "Running juror reputation demo (register → vote → minority slash → before/after table)..."
        npm run demo:jurors
        ;;
    stablecoin)
        echo "Deploying contracts..."
        npm run hardhat:deploy:local
        echo ""
        echo "Running stablecoin escrow demo (ERC-20 escrow + gas comparison + reputation)..."
        npm run demo:stablecoin
        ;;
    both)
        echo "Deploying contracts..."
        npm run hardhat:deploy:local
        echo ""
        echo "Running happy-path demo..."
        npm run demo:good
        echo ""
        echo "Running dispute-flow demo..."
        npm run demo:bad
        ;;
    node)
        echo "Hardhat node is running at http://localhost:8545 (chain ID 31337)."
        echo "Import any private key printed above into MetaMask to interact manually."
        echo "Press Ctrl+C to stop."
        wait "$NODE_PID"
        exit 0
        ;;
    *)
        echo "Unknown DEMO='${DEMO}'. Valid values: good | bad | jurors | stablecoin | both | node" >&2
        exit 1
        ;;
esac

echo ""
echo "Demo complete. Node is still running at http://localhost:8545."
echo "Press Ctrl+C to stop."
wait "$NODE_PID"
