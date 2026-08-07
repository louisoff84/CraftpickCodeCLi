#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ est requis."
  exit 1
fi

MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [ "$MAJOR" -lt 20 ]; then
  echo "Node.js 20+ est requis. Version actuelle: $(node -v)"
  exit 1
fi

npm link

echo
echo "Craftpick Code installé."
echo "Lance: craftpickcode"
