#!/usr/bin/env bash
# Run gh models eval on every .prompt.yml in .github/prompts/
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if ! command -v gh >/dev/null 2>&1; then
	echo "gh CLI is required. Install: https://cli.github.com/" >&2
	exit 1
fi

if ! gh models eval --help >/dev/null 2>&1; then
	echo "GitHub CLI Models support is required (gh models eval)." >&2
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
	gh models eval "$f"
done

echo "All prompt evaluations passed."
