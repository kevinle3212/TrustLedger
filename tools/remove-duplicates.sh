#!/usr/bin/env bash
#
# Scan for macOS-style duplicate filenames and optionally remove them.
#
# Matches names like:
#   file 2.txt, file (2).txt, file copy.txt, file copy 2.txt
#
# Usage:
#   tools/remove-duplicates.sh [directory]
#   tools/remove-duplicates.sh --fail-on-found .
#   tools/remove-duplicates.sh --delete --max-depth 5 .
#   tools/remove-duplicates.sh --delete --yes --include-dirs .

set -Eeuo pipefail

TARGET="."
MAX_DEPTH=3
DELETE=0
ASSUME_YES=0
INCLUDE_DIRS=0
FAIL_ON_FOUND=0
DEFAULT_EXCLUDES=(
    ".git"
    ".next"
    "artifacts"
    "cache"
    "contracts/cache"
    "contracts/out"
    "hardhat-cache"
    "logs"
    "node_modules"
    "site"
    "src/.next"
    "src/node_modules"
    "src/playwright-report"
    "tmp"
)

usage() {
    sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
}

fail() {
    printf 'remove-duplicates: %s\n' "$1" >&2
    exit "${2:-1}"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --delete) DELETE=1 ;;
        --fail-on-found) FAIL_ON_FOUND=1 ;;
        --yes|-y) ASSUME_YES=1 ;;
        --include-dirs) INCLUDE_DIRS=1 ;;
        --max-depth)
            shift
            [[ $# -gt 0 ]] || fail "--max-depth requires a value" 2
            MAX_DEPTH="$1"
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        -*)
            fail "unknown option '$1' (use --help)" 2
            ;;
        *)
            TARGET="$1"
            ;;
    esac
    shift
done

[[ -d "$TARGET" ]] || fail "'$TARGET' is not a directory" 2
[[ "$MAX_DEPTH" =~ ^[0-9]+$ && "$MAX_DEPTH" -gt 0 ]] || fail "--max-depth must be a positive integer" 2

PATTERN='( [0-9]+| \([0-9]+\)| copy( [0-9]+)?)(\.[^.]+)?$'
FIND_TYPE=(-type f)
if [[ "$INCLUDE_DIRS" -eq 1 ]]; then
    FIND_TYPE=( "(" -type f -o -type d ")" )
fi
PRUNE_EXPR=()
for excluded in "${DEFAULT_EXCLUDES[@]}"; do
    PRUNE_EXPR+=( -path "$TARGET/$excluded" -o -path "$TARGET/$excluded/*" -o )
done
unset 'PRUNE_EXPR[${#PRUNE_EXPR[@]}-1]'

MATCHES=()
while IFS= read -r -d '' item; do
    base="$(basename "$item")"
    if [[ "$base" =~ $PATTERN ]]; then
        MATCHES+=("$item")
    fi
done < <(
    find "$TARGET" -mindepth 1 -maxdepth "$MAX_DEPTH" \
        \( "${PRUNE_EXPR[@]}" \) -prune -o "${FIND_TYPE[@]}" -print0 2>/dev/null
)

if [[ "${#MATCHES[@]}" -eq 0 ]]; then
    printf 'No duplicate-looking paths found in %s (max depth %s).\n' "$TARGET" "$MAX_DEPTH"
    exit 0
fi

printf 'Found %s duplicate-looking path(s):\n' "${#MATCHES[@]}"
printf '  %s\n' "${MATCHES[@]}"

if [[ "$DELETE" -eq 0 ]]; then
    printf '\nScan only. Re-run with --delete to remove these paths.\n'
    if [[ "$FAIL_ON_FOUND" -eq 1 ]]; then
        exit 1
    fi
    exit 0
fi

if [[ "$ASSUME_YES" -ne 1 ]]; then
    printf '\nRemove these %s path(s)? [y/N] ' "${#MATCHES[@]}"
    read -r answer || exit 1
    [[ "$answer" =~ ^[Yy]([Ee][Ss])?$ ]] || { printf 'Aborted.\n'; exit 0; }
fi

for item in "${MATCHES[@]}"; do
    if [[ -d "$item" ]]; then
        rm -rf -- "$item"
    else
        rm -f -- "$item"
    fi
    printf 'Removed: %s\n' "$item"
done

printf 'Done.\n'
