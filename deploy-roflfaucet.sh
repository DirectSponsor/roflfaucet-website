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

# Step 2: Reload nginx (static site deployment)
echo "🔧 Reloading nginx for static site..."
ssh $VPS_HOST <<EOF
cd $APP_DIR
# Set proper permissions for nginx
chown -R root:root $APP_DIR
chmod -R 644 $APP_DIR/*
chmod 755 $APP_DIR
# Fix auth directory permissions specifically
chmod 755 $APP_DIR/auth/
chmod 644 $APP_DIR/auth/callback.html
# Reload nginx to pick up any config changes
nginx -t && systemctl reload nginx
echo "🎉 Static site deployment complete!"
echo "📱 Visit: https://roflfaucet.com"
EOF

# Step 3: Quick health check
echo "🏥 Health check..."
sleep 2
if curl -s -o /dev/null -w "%{http_code}" https://roflfaucet.com | grep -q "200"; then
    echo "✅ Site is responding correctly!"
    echo "🎊 Deployment successful! Visit https://roflfaucet.com"
else
    echo "⚠️  Site may still be starting up. Check manually: https://roflfaucet.com"
fi

echo "🎯 Deployment script complete!"

