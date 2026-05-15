#!/usr/bin/env bash
# Kjøres på Hetzner-serveren etter git pull
set -e

SITE_DIR=/var/www/mindmatter
API_DIR=/opt/mindmatter-api

echo "→ Bygger frontend..."
npm ci --legacy-peer-deps
npm run build

echo "→ Kopierer dist/ til $SITE_DIR..."
sudo rm -rf "$SITE_DIR/dist"
sudo cp -r dist "$SITE_DIR/"

echo "→ Installerer API-avhengigheter..."
cd server
npm ci --omit=dev
cd ..
sudo rsync -a --delete server/ "$API_DIR/"

echo "→ Restarter API-tjeneste..."
sudo systemctl restart mindmatter-api

echo "→ Reloader nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✓ Deploy fullført"
