#!/usr/bin/env bash
#
# Keep a command awake for a fixed duration.
#
# Usage:
#   tools/keep-awake.sh --minutes 30 -- npm run foundry:test
#   tools/keep-awake.sh 30 npm run foundry:test
#
# macOS uses caffeinate. Linux falls back to systemd-inhibit when available,
# then runs the command normally with a warning.

set -Eeuo pipefail

usage() {
    sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
}

fail() {
    printf 'keep-awake: %s\n' "$1" >&2
    exit "${2:-1}"
}

MINUTES=""

if [[ "${1:-}" == "--run-timer" ]]; then
    shift
    [[ $# -gt 0 ]] || fail "--run-timer requires seconds" 2
    SECONDS_TO_RUN="$1"
    shift
    [[ "${1:-}" == "--" ]] && shift
    "$@" &
    child=$!
    (
        sleep "$SECONDS_TO_RUN"
        kill "$child" >/dev/null 2>&1 || true
    ) &
    timer=$!
    set +e
    wait "$child"
    status=$?
    set -e
    kill "$timer" >/dev/null 2>&1 || true
    exit "$status"
fi

while [[ $# -gt 0 ]]; do
    case "$1" in
        --minutes|-m)
            shift
            [[ $# -gt 0 ]] || fail "--minutes requires a value" 2
            MINUTES="$1"
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        --)
            shift
            break
            ;;
        -*)
            fail "unknown option '$1' (use --help)" 2
            ;;
        *)
            if [[ -z "$MINUTES" ]]; then
                MINUTES="$1"
                shift
                break
            fi
            break
            ;;
    esac
    shift
done

[[ -n "$MINUTES" ]] || fail "missing duration in minutes (use --help)" 2
[[ "$MINUTES" =~ ^[0-9]+$ && "$MINUTES" -gt 0 ]] || fail "minutes must be a positive integer" 2
[[ $# -gt 0 ]] || fail "missing command to run" 2

SECONDS_TO_RUN=$((MINUTES * 60))
printf 'Running for up to %s minute(s): %s\n' "$MINUTES" "$*"

if command -v caffeinate >/dev/null 2>&1; then
    caffeinate -dims "$0" --run-timer "$SECONDS_TO_RUN" -- "$@"
    exit $?
fi

if command -v systemd-inhibit >/dev/null 2>&1; then
    systemd-inhibit --what=idle:sleep --why="TrustLedger keep-awake" "$0" --run-timer "$SECONDS_TO_RUN" -- "$@"
    exit $?
fi

printf 'keep-awake: no caffeinate/systemd-inhibit found; running without sleep inhibition.\n' >&2
"$0" --run-timer "$SECONDS_TO_RUN" -- "$@"
