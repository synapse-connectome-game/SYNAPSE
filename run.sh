#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi

PYTHON="${PWD}/.venv/bin/python"

if ! "$PYTHON" -c "import flask, numpy" >/dev/null 2>&1; then
  echo "Installing dependencies..."
  "$PYTHON" -m pip install -r requirements.txt
fi

echo ""
echo "SYNAPSE"
echo "Open http://localhost:5050"
echo ""

"$PYTHON" -m backend.app