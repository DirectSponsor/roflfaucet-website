const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
};

const dbName = process.env.DB_NAME || 'gamification_db';

async function setupDatabase() {
    let connection;
    
    try {
        console.log('🗄️  Setting up centralized gamification database...');
        
        // Connect to MySQL server (without specifying database)
        connection = await mysql.createConnection(dbConfig);
        
        // Create database if it doesn't exist
        console.log(`📊 Creating database '${dbName}' if it doesn't exist...`);
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
        
        // Switch to the new database
        await connection.execute(`USE ${dbName}`);
        console.log(`✅ Connected to database '${dbName}'`);
        
        // Read and execute schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = await fs.readFile(schemaPath, 'utf8');
        
        console.log('📋 Executing database schema...');
        await connection.execute(schemaSql);
        console.log('✅ Database schema created successfully');
        
        // Verify tables were created
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('📁 Created tables:');
        tables.forEach(table => {
            console.log(`   - ${Object.values(table)[0]}`);
        });
        
        // Create a test user
        console.log('👤 Creating test user...');
        const bcrypt = require('bcrypt');
        const testPassword = await bcrypt.hash('test123', 10);
        
        try {
            const [result] = await connection.execute(`
                INSERT INTO users (username, email, password_hash, display_name)
                VALUES (?, ?, ?, ?)
            `, ['testuser', 'test@example.com', testPassword, 'Test User']);
            
            const testUserId = result.insertId;
            
            // Create balance record for test user
            await connection.execute(`
                INSERT INTO balances (user_id) VALUES (?)
            `, [testUserId]);
            
            console.log(`✅ Test user created with ID: ${testUserId}`);
            console.log('   Username: testuser');
            console.log('   Password: test123');
            console.log('   Email: test@example.com');
            
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                console.log('ℹ️  Test user already exists, skipping...');
            } else {
                throw error;
            }
        }
        
        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Update your .env file with database credentials');
        console.log('2. Start the database API server: node database/api-server.js');
        console.log('3. Update your ROFLFaucet backend to use the new API');
        console.log('\n🔧 Environment variables needed:');
        console.log('   DB_HOST=localhost');
        console.log('   DB_USER=root');
        console.log('   DB_PASSWORD=your_password');
        console.log(`   DB_NAME=${dbName}`);
        console.log('   DB_API_PORT=3001');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('1. Make sure MySQL is running');
        console.error('2. Check your database credentials');
        console.error('3. Ensure the user has CREATE DATABASE privileges');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run if this script is executed directly
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };

