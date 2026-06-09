#!/usr/bin/env bash
# Run gh models eval on every .prompt.yml in .github/prompts/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

VERBOSE=0

usage() {
	cat <<'USAGE'
Usage: bash scripts/models/eval-prompts.sh [--verbose]

Requires:
  gh CLI with GitHub Models support
  .github/prompts/*.prompt.yml files
  GitHub authentication that can access Models
USAGE
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--verbose|-v) VERBOSE=1 ;;
		--help|-h) usage; exit 0 ;;
		*) echo "Unknown option: $1" >&2; usage; exit 2 ;;
	esac
	shift
done

if ! command -v gh >/dev/null 2>&1; then
	echo "gh CLI is required. Install: https://cli.github.com/" >&2
	exit 1
fi

if ! gh models eval --help >/dev/null 2>&1; then
	echo "GitHub CLI Models support is required (gh models eval)." >&2
	echo "Update gh and confirm you are authenticated: gh auth status" >&2
	exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
	echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
	exit 1
fi

shopt -s nullglob
files=(.github/prompts/*.prompt.yml)
if [ ${#files[@]} -eq 0 ]; then
	echo "No .prompt.yml files found in .github/prompts/" >&2
	exit 1
fi

for f in "${files[@]}"; do
	echo "==> gh models eval $f"
	if [[ "$VERBOSE" -eq 1 ]]; then
		gh models eval "$f"
	else
		gh models eval "$f" || {
			echo "Prompt evaluation failed for $f. Re-run with --verbose for full output." >&2
			exit 1
		}
	fi
done

echo "All prompt evaluations passed."
