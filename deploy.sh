#!/bin/bash
# ROFLFaucet Deployment Script
# Quick deployment to production VPS

set -e  # Exit on any error

VPS_HOST="root@89.116.44.206"
VPS_PASSWORD="OqzfbpLzJNq3llwI"
APP_DIR="/root/roflfaucet"

echo "🚀 Starting ROFLFaucet deployment..."

# Step 1: Sync files to VPS
echo "📦 Syncing files to VPS..."
rsync -avz --delete \
  --exclude 'node_modules/' \
  --exclude '.git/' \
  --exclude '*.log' \
  --exclude 'deploy.sh' \
  . $VPS_HOST:$APP_DIR/ \
  --rsh="sshpass -p '$VPS_PASSWORD' ssh -o StrictHostKeyChecking=no"

echo "✅ Files synced successfully!"

# Step 2: Install dependencies and restart
echo "🔧 Installing dependencies and restarting..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no $VPS_HOST << EOF
cd $APP_DIR
npm install --production
pm2 restart roflfaucet
echo "🎉 Deployment complete!"
echo "📱 Visit: https://roflfaucet.com"
echo "🎥 Video API: https://roflfaucet.com/api/video/random"
EOF

# Step 3: Quick health check
echo "🏥 Health check..."
sleep 3
if curl -s https://roflfaucet.com/api/health > /dev/null; then
    echo "✅ Site is responding correctly!"
    echo "🎊 Deployment successful! Visit https://roflfaucet.com"
else
    echo "⚠️  Site may still be starting up. Check manually: https://roflfaucet.com"
fi

echo "🎯 Deployment script complete!"

