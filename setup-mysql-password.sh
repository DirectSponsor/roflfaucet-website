#!/bin/bash

# MySQL Password Setup Helper
# This script helps set up MySQL authentication for the gamification database

echo "🔐 MySQL Password Setup Helper"
echo "=============================="
echo ""
echo "This script will help you set up MySQL authentication on auth.directsponsor.org"
echo ""

# Ask user for MySQL root password
echo "Please enter your MySQL root password (or press Enter if you don't know it):"
read -s mysql_password

if [ -z "$mysql_password" ]; then
    echo ""
    echo "💡 No password provided. Let's try to find or reset the MySQL password."
    echo ""
    
    # Try to connect without password
    echo "🔍 Checking if MySQL allows passwordless root access..."
    if ssh root@auth.directsponsor.org "mysql -u root -e 'SHOW DATABASES;'" 2>/dev/null; then
        echo "✅ MySQL allows passwordless access!"
        echo "📝 We can proceed with the database setup."
        exit 0
    fi
    
    echo "❌ MySQL requires a password."
    echo ""
    echo "🔧 Options to fix this:"
    echo "1. Find your MySQL password in your server documentation"
    echo "2. Reset MySQL root password (requires stopping MySQL service)"
    echo "3. Create a new MySQL user for the application"
    echo ""
    
    echo "Would you like to try resetting the MySQL root password? (y/n)"
    read -r reset_choice
    
    if [ "$reset_choice" = "y" ] || [ "$reset_choice" = "Y" ]; then
        echo ""
        echo "🔄 Attempting to reset MySQL root password..."
        ssh root@auth.directsponsor.org << 'EOF'
# Stop MySQL
systemctl stop mariadb

# Start MySQL in safe mode
mysqld_safe --skip-grant-tables --user=mysql &
SAFE_PID=$!

# Wait for MySQL to start
sleep 5

# Reset password
mysql -u root << MYSQL_RESET
USE mysql;
UPDATE user SET password=PASSWORD('') WHERE User='root';
FLUSH PRIVILEGES;
MYSQL_RESET

# Kill safe mode
kill $SAFE_PID

# Start MySQL normally
systemctl start mariadb

echo "✅ MySQL root password reset (now empty)"
EOF
    else
        echo ""
        echo "📋 Manual steps to set up MySQL:"
        echo "1. SSH to your server: ssh root@auth.directsponsor.org"
        echo "2. Find your MySQL password or reset it"
        echo "3. Test: mysql -u root -p"
        echo "4. Create the gamification database manually:"
        echo "   mysql -u root -p < /root/gamification-api/schema.sql"
        echo ""
        exit 1
    fi
else
    echo ""
    echo "🔍 Testing MySQL connection with provided password..."
    
    # Store password on server and test
    ssh root@auth.directsponsor.org "echo '$mysql_password' > /root/.mysql_root_password"
    
    if ssh root@auth.directsponsor.org "MYSQL_PWD=\$(cat /root/.mysql_root_password) mysql -u root -e 'SHOW DATABASES;'" 2>/dev/null; then
        echo "✅ MySQL connection successful!"
        echo "📝 Password stored in /root/.mysql_root_password"
        echo "🎉 You can now run the database setup script."
    else
        echo "❌ MySQL connection failed with the provided password."
        ssh root@auth.directsponsor.org "rm -f /root/.mysql_root_password"
        echo "Please check your password and try again."
        exit 1
    fi
fi

echo ""
echo "🚀 Ready to proceed with database setup!"
echo "Run: ./setup-production-database-v2.sh"

