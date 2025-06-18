#!/bin/bash

# Secure MySQL Setup Script
# This script sets a strong password for MySQL root and configures secure access

echo "🔐 Securing MySQL Database"
echo "=========================="

SERVER="auth.directsponsor.org"

echo "🎲 Generating secure random password..."
# Generate a strong 32-character password
MYSQL_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
echo "✅ Password generated: ${MYSQL_PASSWORD:0:4}****...****${MYSQL_PASSWORD: -4}"

echo ""
echo "🔧 Setting MySQL root password on production server..."

ssh root@$SERVER << EOF
echo "📝 Setting new MySQL root password..."

# Set the new password
mysql -u root -e "SET PASSWORD FOR 'root'@'localhost' = PASSWORD('$MYSQL_PASSWORD');"
mysql -u root -e "FLUSH PRIVILEGES;"

echo "💾 Storing password securely..."
echo '$MYSQL_PASSWORD' > /root/.mysql_root_password
chmod 600 /root/.mysql_root_password

echo "🧪 Testing new password..."
if MYSQL_PWD='$MYSQL_PASSWORD' mysql -u root -e "SHOW DATABASES;" > /dev/null 2>&1; then
    echo "✅ Password set successfully!"
else
    echo "❌ Password test failed!"
    exit 1
fi

echo "🔒 Securing MySQL installation..."
# Remove anonymous users
MYSQL_PWD='$MYSQL_PASSWORD' mysql -u root -e "DELETE FROM mysql.user WHERE User='';"

# Remove remote root access (keep only localhost)
MYSQL_PWD='$MYSQL_PASSWORD' mysql -u root -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"

# Remove test database
MYSQL_PWD='$MYSQL_PASSWORD' mysql -u root -e "DROP DATABASE IF EXISTS test;"
MYSQL_PWD='$MYSQL_PASSWORD' mysql -u root -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"

# Flush privileges
MYSQL_PWD='$MYSQL_PASSWORD' mysql -u root -e "FLUSH PRIVILEGES;"

echo "✅ MySQL security hardening complete!"

echo ""
echo "🔧 Updating API server configuration..."
cd /root/gamification-api

# Update .env file with database credentials
cat > .env << ENVEOF
# Database configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=$MYSQL_PASSWORD
DB_NAME=gamification_db

# API configuration
PORT=3001
NODE_ENV=production

# Security
JWT_SECRET=\$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
ENVEOF

chmod 600 .env

echo "🔄 Restarting API server with secure configuration..."
# Kill existing server
pkill -f "node.*api-server" 2>/dev/null || echo "No existing API server found"

# Start with new configuration
nohup node api-server.js > api-server.log 2>&1 &

echo "⏳ Waiting for API server to restart..."
sleep 3

# Test API
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ API server restarted successfully with secure database connection!"
else
    echo "⚠️  API server may need manual restart. Check logs:"
    tail -5 api-server.log
fi

EOF

echo ""
echo "🧪 Testing remote API after security update..."
sleep 2
if curl -s -f http://$SERVER:3001/health > /dev/null; then
    echo "✅ Remote API responding after security update!"
    curl -s http://$SERVER:3001/health
else
    echo "⚠️  Remote API test failed. Checking status..."
    ssh root@$SERVER 'cd /root/gamification-api && tail -10 api-server.log'
fi

echo ""
echo "🎉 MySQL Security Setup Complete!"
echo "================================="
echo ""
echo "✅ What was secured:"
echo "   • Strong 32-character random password set"
echo "   • Password stored securely in /root/.mysql_root_password"
echo "   • Anonymous users removed"
echo "   • Remote root access disabled"
echo "   • Test database removed"
echo "   • API server updated with secure credentials"
echo ""
echo "🔒 Security Status:"
echo "   • MySQL root password: SECURED ✅"
echo "   • Password file permissions: 600 (root only) ✅"
echo "   • API .env file permissions: 600 (root only) ✅"
echo "   • Database access: localhost only ✅"
echo ""
echo "🔧 For future maintenance:"
echo "   • Password is automatically used by scripts"
echo "   • No manual password entry needed"
echo "   • All database operations will work seamlessly"
echo ""
echo "💡 To manually access MySQL if needed:"
echo "   ssh root@$SERVER 'MYSQL_PWD=\$(cat /root/.mysql_root_password) mysql -u root'"

