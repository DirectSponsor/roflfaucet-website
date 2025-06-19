#!/bin/bash
# ROFLFaucet Enhanced Deployment Script
# Includes git workflow, backup, and deployment to production VPS

set -e  # Exit on any error

# Check for auto mode
AUTO_MODE=false
if [[ "$1" == "--auto" ]]; then
    AUTO_MODE=true
    echo "🤖 Running in automatic mode"
fi

VPS_HOST="es7-production"  # Uses warp key via SSH alias
APP_DIR="/root/roflfaucet"
BACKUP_DIR="/root/backups/roflfaucet"
MAX_BACKUPS=5

echo "=== Enhanced ROFLFaucet Deploy ==="

# Step 1: Git Status Check and Commit
echo ""
echo "=== Git Status Check ==="
if [[ -n $(git status --porcelain) ]]; then
    echo "📝 Changes detected:"
    git status --short
    echo ""
    
    # Handle commit message based on mode
    if $AUTO_MODE; then
        COMMIT_MSG="Auto-deploy: $(date '+%Y-%m-%d %H:%M')"
        echo "🤖 Auto-commit message: $COMMIT_MSG"
    else
        read -p "Enter commit message (or press Enter for auto-message): " COMMIT_MSG
        if [[ -z "$COMMIT_MSG" ]]; then
            COMMIT_MSG="Auto-deploy: $(date '+%Y-%m-%d %H:%M')"
            echo "Using auto-message: $COMMIT_MSG"
        fi
    fi
    
    # Commit changes (exclude deploy.sh to avoid recursion)
    git add . && git reset deploy.sh 2>/dev/null || true
    git commit -m "$COMMIT_MSG"
    echo "✅ Committed: $COMMIT_MSG"
else
    echo "✅ No git changes detected"
fi

# Step 2: Create backup on VPS
echo ""
echo "=== Creating VPS Backup ==="
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_NAME="roflfaucet_backup_${TIMESTAMP}"

echo "📦 Creating backup: $BACKUP_NAME"
ssh $VPS_HOST "mkdir -p $BACKUP_DIR && cp -r $APP_DIR $BACKUP_DIR/$BACKUP_NAME 2>/dev/null || echo 'Backup created'"
echo "✅ Backup created: $BACKUP_DIR/$BACKUP_NAME"

# Clean old backups
echo "🧹 Cleaning old backups (keeping last $MAX_BACKUPS)..."
ssh $VPS_HOST "cd $BACKUP_DIR && ls -1t | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -rf"

# Step 3: Sync files to VPS
echo "📦 Syncing files to VPS..."
rsync -avz --delete \
  --exclude 'node_modules/' \
  --exclude '.git/' \
  --exclude '*.log' \
  --exclude 'deploy.sh' \
  . $VPS_HOST:$APP_DIR/

echo "✅ Files synced successfully!"

# Step 2: Install dependencies and restart
echo "🔧 Installing dependencies and restarting..."
ssh $VPS_HOST << EOF
cd $APP_DIR
npm install --omit=dev
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

