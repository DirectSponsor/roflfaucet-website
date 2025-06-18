#!/bin/bash

# Production Database Troubleshooting Script
# This script helps diagnose issues with the centralized database setup

echo "🔍 ROFLFaucet Production Database Troubleshooting"
echo "================================================="
echo ""

SERVER="auth.directsponsor.org"
API_PORT="3001"

echo "📋 System Status Check"
echo "----------------------"

echo "🔗 Testing SSH connection..."
if ssh root@$SERVER "echo 'SSH connection successful'" 2>/dev/null; then
    echo "✅ SSH connection working"
else
    echo "❌ SSH connection failed"
    exit 1
fi

echo ""
echo "🗄️  Database Status"
echo "-------------------"
ssh root@$SERVER << 'EOF'
echo "📊 MariaDB service status:"
systemctl status mariadb --no-pager | head -10

echo ""
echo "🔌 Testing MySQL connection:"
if mysql -u root -e "SHOW DATABASES;" 2>/dev/null; then
    echo "✅ MySQL accessible without password"
    mysql -u root -e "USE gamification_db; SHOW TABLES;" 2>/dev/null || echo "⚠️  gamification_db not found or incomplete"
elif [ -f /root/.mysql_root_password ]; then
    echo "🔑 Testing with stored password..."
    if MYSQL_PWD=$(cat /root/.mysql_root_password) mysql -u root -e "SHOW DATABASES;" 2>/dev/null; then
        echo "✅ MySQL accessible with stored password"
        MYSQL_PWD=$(cat /root/.mysql_root_password) mysql -u root -e "USE gamification_db; SHOW TABLES;" 2>/dev/null || echo "⚠️  gamification_db not found or incomplete"
    else
        echo "❌ Stored password is incorrect"
    fi
else
    echo "❌ MySQL requires password but none stored"
fi
EOF

echo ""
echo "🚀 API Server Status"
echo "--------------------"
ssh root@$SERVER << 'EOF'
cd /root/gamification-api

echo "📝 Checking for Node.js:"
if command -v node &> /dev/null; then
    echo "✅ Node.js installed: $(node --version)"
    echo "✅ npm installed: $(npm --version)"
else
    echo "❌ Node.js not installed"
fi

echo ""
echo "🔍 Checking for API server process:"
API_PID=$(pgrep -f "node.*api-server.js" 2>/dev/null || echo "")
if [ -n "$API_PID" ]; then
    echo "✅ API server running with PID: $API_PID"
    ps aux | grep $API_PID | grep -v grep
else
    echo "❌ API server not running"
fi

echo ""
echo "🌐 Checking port $API_PORT:"
if netstat -tlnp 2>/dev/null | grep ":$API_PORT " >/dev/null; then
    echo "✅ Port $API_PORT is open"
    netstat -tlnp | grep ":$API_PORT "
else
    echo "❌ Port $API_PORT is not open"
fi

echo ""
echo "📄 Recent API server logs:"
if [ -f api-server.log ]; then
    echo "--- Last 10 lines of api-server.log ---"
    tail -10 api-server.log
else
    echo "❌ No api-server.log file found"
fi
EOF

echo ""
echo "🧪 API Connectivity Tests"
echo "-------------------------"

echo "🔗 Testing local API connection (from server):"
ssh root@$SERVER "curl -s -m 5 http://localhost:$API_PORT/health" 2>/dev/null || echo "❌ Local API connection failed"

echo ""
echo "🌍 Testing remote API connection (from here):"
curl -s -m 5 http://$SERVER:$API_PORT/health 2>/dev/null || echo "❌ Remote API connection failed"

echo ""
echo "🔧 Quick Fix Commands"
echo "====================="
echo ""
echo "To restart the API server:"
echo "  ssh root@$SERVER 'cd /root/gamification-api && pkill -f \"node.*api-server\" && nohup node api-server.js > api-server.log 2>&1 &'"
echo ""
echo "To check logs in real-time:"
echo "  ssh root@$SERVER 'tail -f /root/gamification-api/api-server.log'"
echo ""
echo "To manually test MySQL:"
echo "  ssh root@$SERVER 'mysql -u root -p'"
echo ""
echo "To reinstall Node.js dependencies:"
echo "  ssh root@$SERVER 'cd /root/gamification-api && npm install'"

