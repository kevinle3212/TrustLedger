#!/usr/bin/env bash
# scripts/run-demo.sh - Interactive TrustLedger scenario runner.
#
# Usage:
#   ./scripts/run-demo.sh        # interactive menu - type 1-5 to pick
#   ./scripts/run-demo.sh 2      # run scenario 2 directly
#
# Scenarios:
#   1 - Plaintiff (client) wins          : unanimous 0% ruling
#   2 - Defendant (freelancer) wins      : unanimous 100% ruling
#   3 - Tie                              : unanimous 50% ruling
#   4 - Arbitration ruling, in favor of client   : J1=0%, J2=0%, J3=100% (minority) -> median 0%
#   5 - Arbitration ruling, in favor of freelancer: J1=100%, J2=100%, J3=0% (minority) -> median 100%
#
# Prerequisites: npm run compile (contracts must be compiled)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_URL="http://127.0.0.1:8545"
NODE_PID=""

cleanup() {
    if [[ -n "$NODE_PID" ]]; then
        echo ""
        echo "Stopping Hardhat node (PID $NODE_PID)..."
        kill "$NODE_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

node_running() {
    curl -sf -X POST "$NODE_URL" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        > /dev/null 2>&1
}

ensure_node_and_contracts() {
    if node_running; then
        echo "  ok Hardhat node already running at $NODE_URL"
        # NODE_PID stays empty - we don't own this process, won't kill it on exit
        if [[ ! -f "$PROJECT_DIR/artifacts/deployed-addresses.json" ]]; then
            echo "  .. Contracts not yet deployed - deploying now..."
            cd "$PROJECT_DIR"
            npm run hardhat:deploy:local
            echo "  ok Contracts deployed"
        else
            echo "  ok Contracts already deployed"
        fi
    else
        echo "Starting Hardhat node..."
        cd "$PROJECT_DIR"
        npm run node > /tmp/trustledger-node.log 2>&1 &
        NODE_PID=$!

        echo "Waiting for node at $NODE_URL..."
        for _ in $(seq 1 40); do
            if node_running; then
                echo "  ok Node ready"
                break
            fi
            sleep 0.5
        done

        if ! node_running; then
            echo "ERROR: Node failed to start. Check /tmp/trustledger-node.log" >&2
            exit 1
        fi

        echo ""
        echo "Deploying contracts..."
        npm run hardhat:deploy:local
        echo "  ok Contracts deployed"
    fi
}

run_scenario() {
    local n="$1"
    cd "$PROJECT_DIR"
    echo ""
    DEMO_SCENARIO="$n" TS_NODE_PROJECT=tsconfig.hardhat.json \
        npx hardhat run scripts/demo/demo-scenarios.ts --network localhost --no-compile
}

run_jurors() {
    cd "$PROJECT_DIR"
    echo ""
    TS_NODE_PROJECT=tsconfig.hardhat.json \
        npx hardhat run scripts/demo/demo-jurors.ts --network localhost --no-compile
}

run_stablecoin() {
    cd "$PROJECT_DIR"
    echo ""
    TS_NODE_PROJECT=tsconfig.hardhat.json \
        npx hardhat run scripts/demo/demo-stablecoin.ts --network localhost --no-compile
}

print_usage() {
    echo "Usage: $0 [1-7]" >&2
    echo "" >&2
    echo "  1  Plaintiff (client) wins          - unanimous 0% ruling" >&2
    echo "  2  Defendant (freelancer) wins       - unanimous 100% ruling" >&2
    echo "  3  Tie                               - unanimous 50% ruling" >&2
    echo "  4  Arbitration ruling, client wins   - 2 vote 0%, 1 vote 100% (minority slashed)" >&2
    echo "  5  Arbitration ruling, freelancer wins - 2 vote 100%, 1 vote 0% (minority slashed)" >&2
    echo "  6  Juror reputation demo             - register, vote, slash, before/after table" >&2
    echo "  7  Stablecoin escrow demo            - ERC-20 escrow + gas comparison + reputation" >&2
}

# ── Main ──────────────────────────────────────────────────────────────────────

if [[ $# -ge 1 ]]; then
    SCENARIO="$1"
    if [[ ! "$SCENARIO" =~ ^[1-7]$ ]]; then
        print_usage
        exit 1
    fi
    echo ""
    ensure_node_and_contracts
    case "$SCENARIO" in
        6) run_jurors ;;
        7) run_stablecoin ;;
        *) run_scenario "$SCENARIO" ;;
    esac
    exit 0
fi

print_menu() {
    echo ""
    echo "============================================================"
    echo "  TrustLedger - Demo Scenario Runner"
    echo "  (Ctrl+C to exit)"
    echo "============================================================"
    echo ""
    echo "  1)  Plaintiff (client) wins"
    echo "      All 3 jurors vote 0% completion -> full refund to client"
    echo ""
    echo "  2)  Defendant (freelancer) wins"
    echo "      All 3 jurors vote 100% completion -> full payment to freelancer"
    echo ""
    echo "  3)  Tie"
    echo "      All 3 jurors vote 50% completion -> split payment"
    echo ""
    echo "  4)  Arbitration ruling, in favor of client"
    echo "      J1=0%, J2=0%, J3=100% (minority) -> median 0%, J3 slashed"
    echo ""
    echo "  5)  Arbitration ruling, in favor of freelancer"
    echo "      J1=100%, J2=100%, J3=0% (minority) -> median 100%, J3 slashed"
    echo ""
    echo "  6)  Juror reputation demo"
    echo "      Register 3 jurors, run dispute, show before/after reputation & stake"
    echo ""
    echo "  7)  Stablecoin escrow demo"
    echo "      ERC-20 token escrow, gas comparison vs ETH, bidirectional reputation"
    echo ""
}

# Interactive mode: start node once, then loop menu until Ctrl+C
ensure_node_and_contracts

while true; do
    print_menu

    while true; do
        printf "Select scenario [1-7]: "
        read -r SCENARIO
        if [[ "$SCENARIO" =~ ^[1-7]$ ]]; then
            break
        fi
        echo "  Invalid input. Enter a number from 1 to 7."
    done

    echo ""
    case "$SCENARIO" in
        6) run_jurors ;;
        7) run_stablecoin ;;
        *) run_scenario "$SCENARIO" ;;
    esac

    echo ""
    echo "------------------------------------------------------------"
    echo "  Scenario complete. Returning to menu..."
    echo "------------------------------------------------------------"
done
