#!/bin/bash

# Usage: keep-awake <minutes> <command>
# 30 = minutes, second argument = command

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: keep-awake <minutes> <command>"
  exit 1
fi

minutes=$1
shift

seconds=$((minutes * 60))

echo "Running for $minutes minutes: $*..."

caffeinate -dims bash -c "$* & pid=$!; sleep $seconds; kill $pid"