#!/bin/bash
# deploy-config.sh - Configure MPPATH for prod or dev deployment

VERSION=$(node -e "console.log(require('./version.json').version)")

if [ "$1" = "dev" ]; then
    MPATH="/meeting-program-dev"
elif [ "$1" = "prod" ]; then
    MPATH="/meeting-program"
else
    echo "Usage: ./deploy-config.sh [prod|dev]"
    exit 1
fi

echo "Configuring for $1 (version: $VERSION, path: $MPATH)"

# Update service-worker.js
sed -i "s|const MPPATH = \".*\"|const MPPATH = \"$MPATH\"|" service-worker.js
sed -i "s|const STATIC_CACHE = \".*\"|const STATIC_CACHE = \`meeting-program-static-v\${VERSION}\`|g" service-worker.js
sed -i "s|const DYNAMIC_CACHE = \".*\"|const DYNAMIC_CACHE = \`meeting-program-dynamic-v\${VERSION}\`|g" service-worker.js

# Update manifest.webmanifest
sed -i "s|\"scope\": \".*\"|\"scope\": \"$MPATH/\"|" manifest.webmanifest
sed -i "s|\"start_url\": \".*\"|\"start_url\": \"$MPATH/\"|" manifest.webmanifest

echo "Done. Check git diff to verify changes."
