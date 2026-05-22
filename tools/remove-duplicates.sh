#!/bin/bash

# Usage: remove-duplicates [directory]
# Finds and removes macOS-style duplicate files/directories with names like:
#   "file 2", "file (2)", "file copy", "file copy 2"
# Defaults to current directory if no argument is given.

TARGET="${1:-.}"

if [ ! -d "$TARGET" ]; then
  echo "Error: '$TARGET' is not a directory."
  exit 1
fi

# Patterns:
#   "name 2", "name 3", ... (space + digit)
#   "name (2)", "name (3)", ... (space + parenthesized digit)
#   "name copy", "name copy 2", ...
PATTERN='( [0-9]+$| \([0-9]+\)$| copy( [0-9]+)?$)'

found=0

while IFS= read -r -d '' item; do
  base="$(basename "$item")"
  if echo "$base" | grep -qE "$PATTERN"; then
    echo "  $item"
    found=$((found + 1))
  fi
done < <(find "$TARGET" -mindepth 1 -maxdepth 3 -print0 2>/dev/null)

if [ "$found" -eq 0 ]; then
  echo "No duplicates found in '$TARGET'."
  exit 0
fi

echo ""
echo "Found $found duplicate(s). Remove them? [y/N]"
read -r answer

if [[ "$answer" =~ ^[Yy]$ ]]; then
  while IFS= read -r -d '' item; do
    base="$(basename "$item")"
    if echo "$base" | grep -qE "$PATTERN"; then
      rm -rf "$item"
      echo "Removed: $item"
    fi
  done < <(find "$TARGET" -mindepth 1 -maxdepth 3 -print0 2>/dev/null)
  echo "Done."
else
  echo "Aborted."
fi
