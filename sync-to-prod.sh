#!/bin/bash
# sync-to-prod.sh - Sync changes from meeting-program-dev to meeting-program

echo "=== Syncing Dev → Prod ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_DIR="$SCRIPT_DIR/meeting-program-dev"
PROD_DIR="$SCRIPT_DIR/meeting-program"

# Check both dirs exist
if [ ! -d "$DEV_DIR" ]; then
    echo "ERROR: Dev repo not found at $DEV_DIR"
    exit 1
fi

if [ ! -d "$PROD_DIR" ]; then
    echo "ERROR: Prod repo not found at $PROD_DIR"
    exit 1
fi

echo "Dev: $DEV_DIR"
echo "Prod: $PROD_DIR"
echo ""

# Get the latest dev commit message for reference
echo "Latest dev commit:"
cd "$DEV_DIR" && git log -1 --oneline
echo ""

# Copy all files from dev to prod (excluding .git)
echo "Copying files from dev to prod..."
rsync -av --exclude='.git' "$DEV_DIR/" "$PROD_DIR/"

echo ""
echo "Files copied. Review changes with: cd meeting-program && git status"
echo ""
echo "To complete sync, run:"
echo "  cd meeting-program"
echo "  git add -A"
echo "  git commit -m 'Sync from dev'"
echo "  git push"
