#!/usr/bin/env bash
set -euo pipefail

if ! command -v semgrep >/dev/null 2>&1; then
  echo "[semgrep] semgrep is not installed. Skipping security AST checks."
  echo "[semgrep] Install with: pipx install semgrep  (or pip install semgrep)"
  exit 0
fi

semgrep scan \
  --config auto \
  --error \
  --exclude js/vendor \
  --exclude coverage \
  --exclude node_modules \
  --exclude playwright-report \
  --exclude test-results \
  --exclude graphify-out \
  .
