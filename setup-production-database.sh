#!/bin/bash

# Production Database Setup Script for ROFLFaucet
# This sets up the centralized gamification database on auth.directsponsor.org

set -e

echo "🗄️  Setting up production database for ROFLFaucet gamification"
echo "============================================================"

# Configuration
DB_HOST="auth.directsponsor.org"
DB_NAME="gamification_db"
DB_USER="root"
API_PORT="3001"

echo "📋 Configuration:"
echo "   Database Host: $DB_HOST"
echo "   Database Name: $DB_NAME"
echo "   API Port: $API_PORT"
echo ""

echo "📦 Step 1: Copying database files to server..."
rsync -avz --progress database/ root@$DB_HOST:/root/gamification-api/

echo "✅ Database files copied successfully!"
echo ""

echo "🔧 Step 2: Setting up database on server..."
ssh root@$DB_HOST << 'EOF'
    echo "🔍 Checking MySQL status..."
    systemctl status mysql --no-pager || echo "⚠️  MySQL not running, attempting to start..."
    
    echo "📦 Installing Node.js dependencies..."
    cd /root/gamification-api
    npm install
    
    echo "🗄️  Setting up MySQL database..."
    # Create database and run schema
    mysql -u root -p << 'MYSQL_EOF'
CREATE DATABASE IF NOT EXISTS gamification_db;
USE gamification_db;
source /root/gamification-api/schema.sql;
MYSQL_EOF
    
    echo "🚀 Starting database API server..."
    # Kill any existing process on port 3001
    lsof -ti:3001 | xargs kill -9 || echo "No process on port 3001"
    
    # Start the database API server with PM2
    pm2 stop gamification-api || echo "gamification-api not running"
    pm2 start api-server.js --name gamification-api --cwd /root/gamification-api
    pm2 save
    
    echo "✅ Database API server started successfully!"
    
    # Test the API
    sleep 3
    echo "🧪 Testing database API..."
    curl -f http://localhost:3001/health || echo "⚠️  API health check failed"
EOF

echo ""
echo "🎉 Production database setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test database API: curl https://auth.directsponsor.org:3001/health"
echo "2. Update ROFLFaucet to use simplified backend"
echo "3. Deploy simplified backend to production"
echo ""
echo "🔧 Environment variables needed for ROFLFaucet:"
echo "   DB_API_BASE_URL=https://auth.directsponsor.org:3001"
echo ""
echo "✨ Your centralized database is ready for multi-site gamification!"

