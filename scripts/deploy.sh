#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="/var/www/hala"
APP_NAME="hala"
BRANCH="main"

echo "========================================="
echo "🚀 Hala Deployment"
echo "========================================="

#──────────────────────────────────────────────
# Enter project
#──────────────────────────────────────────────
cd "$APP_DIR"

#──────────────────────────────────────────────
# Verify Git repository
#──────────────────────────────────────────────
git rev-parse --is-inside-work-tree >/dev/null

CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo ""
    echo "❌ Current branch is '$CURRENT_BRANCH'"
    echo "Expected branch: '$BRANCH'"
    exit 1
fi

#──────────────────────────────────────────────
# Pull latest code
#──────────────────────────────────────────────
echo ""
echo "📥 Pulling latest changes..."
git pull origin "$BRANCH"

#──────────────────────────────────────────────
# Install dependencies
#──────────────────────────────────────────────
echo ""
echo "📦 Installing dependencies..."
npm install

#──────────────────────────────────────────────
# Build
#──────────────────────────────────────────────
echo ""
echo "🏗️ Building application..."
npm run build

#──────────────────────────────────────────────
# Restart
#──────────────────────────────────────────────
echo ""
echo "♻️ Restarting PM2..."
pm2 restart "$APP_NAME"

sleep 2

#──────────────────────────────────────────────
# Verify PM2
#──────────────────────────────────────────────
STATUS=$(pm2 jlist | grep -o '"status":"online"' | head -n1)

if [ -z "$STATUS" ]; then
    echo ""
    echo "❌ PM2 failed to start application."
    exit 1
fi

#──────────────────────────────────────────────
# Summary
#──────────────────────────────────────────────
echo ""
echo "========================================="
echo "✅ Deployment Successful"
echo "========================================="

echo ""
echo "Application : $APP_NAME"
echo "Branch      : $CURRENT_BRANCH"
echo "Commit      : $(git rev-parse --short HEAD)"

echo ""
pm2 status