#!/bin/bash

# Production Database Setup Script for ROFLFaucet v2
# This script sets up the centralized database on auth.directsponsor.org
# Handles Node.js installation and MySQL authentication

set -e  # Exit on any error

# Configuration
SERVER="auth.directsponsor.org"
DB_NAME="gamification_db"
API_PORT="3001"
REMOTE_DIR="/root/gamification-api"

echo "🗄️  Setting up production database for ROFLFaucet gamification (v2)"
echo "================================================================="
echo "📋 Configuration:"
echo "   Database Host: $SERVER"
echo "   Database Name: $DB_NAME"
echo "   API Port: $API_PORT"
echo ""

# Step 1: Copy files to server
echo "📦 Step 1: Copying database files to server..."
rsync -av --exclude='*.log' --exclude='.git' \
    ./database/ \
    root@$SERVER:$REMOTE_DIR/
echo "✅ Database files copied successfully!"
echo ""

# Step 2: Setup on server
echo "🔧 Step 2: Setting up database on server..."
ssh root@$SERVER << 'EOF'
cd /root/gamification-api

echo "🔍 Checking system status..."
systemctl status mariadb --no-pager || echo "MariaDB not running"

echo "📦 Installing Node.js (if needed)..."
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    # Install Node.js 18.x LTS
    curl -sL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
else
    echo "Node.js already installed: $(node --version)"
fi

if ! command -v npm &> /dev/null; then
    echo "Installing npm..."
    yum install -y npm
else
    echo "npm already installed: $(npm --version)"
fi

echo "📦 Installing Node.js dependencies..."
npm install

echo "🗄️  Setting up MySQL database..."
# Check if MySQL is accessible
if mysql -u root -e "SHOW DATABASES;" 2>/dev/null; then
    echo "MySQL accessible without password"
    mysql -u root < schema.sql
elif [ -f /root/.mysql_root_password ]; then
    echo "Using stored MySQL password"
    MYSQL_PWD=$(cat /root/.mysql_root_password) mysql -u root < schema.sql
else
    echo "⚠️  MySQL password needed. Please set it in /root/.mysql_root_password"
    echo "   or run: mysql -u root -p < schema.sql manually"
fi

echo "🚀 Starting database API server..."
# Kill any existing process on port 3001
lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null || echo "No process on port 3001"
ps aux | grep "node.*api-server" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || echo "No gamification-api running"

# Start the API server
nohup node api-server.js > api-server.log 2>&1 &
echo "✅ Database API server started!"

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Check if server is running
API_PID=$(pgrep -f "node.*api-server.js" 2>/dev/null || echo "")
if [ -n "$API_PID" ]; then
    echo "📝 API server running with PID: $API_PID"
    ps aux | grep $API_PID | grep -v grep
else
    echo "⚠️  API server may not have started. Check logs:"
    tail -10 api-server.log
fi

# Test local connection
echo "🧪 Testing local API connection..."
curl -s http://localhost:3001/health || echo "❌ Local health check failed"

EOF

echo ""
echo "🧪 Testing remote database API..."
curl -f -m 10 http://$SERVER:$API_PORT/health || echo "⚠️  Remote API health check failed"

echo ""
echo "🎉 Production database setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Check API server logs: ssh root@$SERVER 'tail -f /root/gamification-api/api-server.log'"
echo "2. Test database API: curl http://auth.directsponsor.org:$API_PORT/health"
echo "3. Update ROFLFaucet to use simplified backend"
echo "4. Deploy simplified backend to production"
echo ""
echo "🔧 Environment variables needed for ROFLaucet:"
echo "   DB_API_BASE_URL=http://auth.directsponsor.org:$API_PORT"
echo ""
echo "🔍 To troubleshoot:"
echo "   - Check logs: ssh root@$SERVER 'cat /root/gamification-api/api-server.log'"
echo "   - Check processes: ssh root@$SERVER 'ps aux | grep node'"
echo "   - Check ports: ssh root@$SERVER 'netstat -tlnp | grep 3001'"
echo ""
echo "✨ Your centralized database is ready for multi-site gamification!"

