const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.DB_API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'gamification.db');
const db = new sqlite3.Database(dbPath);

// Initialize database with schema
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const schemaPath = path.join(__dirname, 'schema-sqlite.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        db.exec(schema, (err) => {
            if (err) {
                console.error('Failed to initialize database:', err);
                reject(err);
            } else {
                console.log('✅ Database initialized successfully');
                resolve();
            }
        });
    });
}

// Helper functions
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
}

function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

async function getUserById(userId) {
    const userSql = `
        SELECT u.*, b.* 
        FROM users u 
        LEFT JOIN balances b ON u.id = b.user_id 
        WHERE u.id = ?
    `;
    return await getQuery(userSql, [userId]);
}

async function createUserBalance(userId) {
    const sql = `
        INSERT OR IGNORE INTO balances (user_id) VALUES (?)
    `;
    await runQuery(sql, [userId]);
}

// API Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Centralized Database API (SQLite)',
        database: 'SQLite'
    });
});

// User Management Routes

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Don't send password hash
        delete user.password_hash;
        
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create new user
app.post('/api/users', async (req, res) => {
    const { username, email, password, display_name } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    try {
        // Hash password
        const password_hash = await bcrypt.hash(password, 10);
        
        // Insert user
        const result = await runQuery(`
            INSERT INTO users (username, email, password_hash, display_name)
            VALUES (?, ?, ?, ?)
        `, [username, email, password_hash, display_name || username]);
        
        const userId = result.id;
        
        // Create balance record
        await createUserBalance(userId);
        
        // Get the complete user record
        const newUser = await getUserById(userId);
        delete newUser.password_hash;
        
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(409).json({ error: 'Username or email already exists' });
        } else {
            res.status(500).json({ error: 'Database error' });
        }
    }
});

// Update user balances
app.post('/api/users/:id/balances', async (req, res) => {
    const userId = req.params.id;
    const { 
        useless_coin_increment = 0,
        roflfaucet_tokens_increment = 0,
        clickforcharity_tokens_increment = 0
    } = req.body;
    
    try {
        // Ensure balance record exists
        await createUserBalance(userId);
        
        // Update balances
        await runQuery(`
            UPDATE balances 
            SET 
                useless_coin_balance = useless_coin_balance + ?,
                roflfaucet_tokens = roflfaucet_tokens + ?,
                clickforcharity_tokens = clickforcharity_tokens + ?,
                total_earned = total_earned + ? + ? + ?,
                last_updated = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [
            useless_coin_increment,
            roflfaucet_tokens_increment,
            clickforcharity_tokens_increment,
            useless_coin_increment,
            roflfaucet_tokens_increment,
            clickforcharity_tokens_increment,
            userId
        ]);
        
        // Get updated user data
        const user = await getUserById(userId);
        delete user.password_hash;
        
        res.json(user);
    } catch (error) {
        console.error('Error updating balances:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Activity Management Routes

// Record an activity
app.post('/api/activities', async (req, res) => {
    const { 
        user_id, 
        site_id, 
        activity_type, 
        tokens_awarded = 0, 
        coins_awarded = 0, 
        description = '',
        metadata = {}
    } = req.body;
    
    if (!user_id || !site_id || !activity_type) {
        return res.status(400).json({ error: 'user_id, site_id, and activity_type are required' });
    }
    
    try {
        // Record the activity
        const result = await runQuery(`
            INSERT INTO activities (user_id, site_id, activity_type, tokens_awarded, coins_awarded, description, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [user_id, site_id, activity_type, tokens_awarded, coins_awarded, description, JSON.stringify(metadata)]);
        
        // Update user balances if rewards were given
        if (tokens_awarded > 0 || coins_awarded > 0) {
            await createUserBalance(user_id);
            
            let tokensColumn = '';
            let tokensValue = 0;
            
            if (tokens_awarded > 0) {
                if (site_id === 'roflfaucet') {
                    tokensColumn = 'roflfaucet_tokens = roflfaucet_tokens + ?,';
                    tokensValue = tokens_awarded;
                } else if (site_id === 'clickforcharity') {
                    tokensColumn = 'clickforcharity_tokens = clickforcharity_tokens + ?,';
                    tokensValue = tokens_awarded;
                }
            }
            
            const updateSql = `
                UPDATE balances 
                SET 
                    useless_coin_balance = useless_coin_balance + ?,
                    ${tokensColumn}
                    total_earned = total_earned + ? + ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `;
            
            const updateParams = [
                coins_awarded,
                ...(tokensValue > 0 ? [tokensValue] : []),
                tokens_awarded,
                coins_awarded,
                user_id
            ];
            
            await runQuery(updateSql, updateParams);
        }
        
        res.status(201).json({ 
            id: result.id,
            message: 'Activity recorded successfully',
            tokens_awarded,
            coins_awarded
        });
    } catch (error) {
        console.error('Error recording activity:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get user activities
app.get('/api/users/:id/activities', async (req, res) => {
    const userId = req.params.id;
    const { site_id, limit = 50, offset = 0 } = req.query;
    
    try {
        let sql = `
            SELECT * FROM activities 
            WHERE user_id = ?
        `;
        let params = [userId];
        
        if (site_id) {
            sql += ` AND site_id = ?`;
            params.push(site_id);
        }
        
        sql += ` ORDER BY activity_date DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        
        const rows = await allQuery(sql, params);
        
        // Parse JSON metadata
        const activities = rows.map(row => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : {}
        }));
        
        res.json(activities);
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Leaderboard Routes

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
    const { site_id = 'roflfaucet', type = 'tokens', limit = 50 } = req.query;
    
    try {
        let orderColumn;
        switch (type) {
            case 'coins':
                orderColumn = 'useless_coin_balance';
                break;
            case 'tokens':
            default:
                orderColumn = site_id === 'roflfaucet' ? 'roflfaucet_tokens' : 'clickforcharity_tokens';
                break;
        }
        
        const sql = `
            SELECT 
                u.id,
                u.username,
                u.display_name,
                b.${orderColumn} as score,
                b.useless_coin_balance,
                b.roflfaucet_tokens,
                b.clickforcharity_tokens
            FROM users u
            LEFT JOIN balances b ON u.id = b.user_id
            WHERE u.is_active = 1
            ORDER BY b.${orderColumn} DESC
            LIMIT ?
        `;
        
        const rows = await allQuery(sql, [parseInt(limit)]);
        
        const leaderboard = rows.map((row, index) => ({
            rank: index + 1,
            ...row
        }));
        
        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Stats Routes

// Get site statistics
app.get('/api/stats/:site_id', async (req, res) => {
    const siteId = req.params.site_id;
    
    try {
        // Get basic stats
        const statsRows = await allQuery(`
            SELECT stat_name, stat_value 
            FROM system_stats 
            WHERE site_id = ? OR site_id = 'global'
        `, [siteId]);
        
        const stats = {};
        statsRows.forEach(row => {
            stats[row.stat_name] = parseFloat(row.stat_value);
        });
        
        // Calculate additional real-time stats
        const userStatsQuery = `
            SELECT 
                COUNT(DISTINCT u.id) as total_users,
                AVG(CASE WHEN b.${siteId}_tokens > 0 THEN b.${siteId}_tokens END) as avg_balance,
                MAX(b.${siteId}_tokens) as top_balance
            FROM users u
            LEFT JOIN balances b ON u.id = b.user_id
            WHERE u.is_active = 1
        `;
        
        const userStats = await getQuery(userStatsQuery);
        
        const activityStats = await getQuery(`
            SELECT 
                COUNT(*) as total_activities,
                SUM(tokens_awarded) as total_tokens_distributed,
                SUM(coins_awarded) as total_coins_distributed
            FROM activities
            WHERE site_id = ?
        `, [siteId]);
        
        res.json({
            ...stats,
            total_users: userStats.total_users || 0,
            avg_balance: userStats.avg_balance || 0,
            top_balance: userStats.top_balance || 0,
            total_activities: activityStats.total_activities || 0,
            site_tokens_distributed: activityStats.total_tokens_distributed || 0,
            site_coins_distributed: activityStats.total_coins_distributed || 0,
            last_updated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Session Management

// Update user session
app.post('/api/sessions', async (req, res) => {
    const { user_id, site_id, last_claim_at, session_data = {} } = req.body;
    
    if (!user_id || !site_id) {
        return res.status(400).json({ error: 'user_id and site_id are required' });
    }
    
    try {
        // Try to update existing session first
        const updateResult = await runQuery(`
            UPDATE sessions 
            SET 
                last_visit_at = CURRENT_TIMESTAMP,
                last_claim_at = COALESCE(?, last_claim_at),
                session_data = ?
            WHERE user_id = ? AND site_id = ?
        `, [last_claim_at, JSON.stringify(session_data), user_id, site_id]);
        
        // If no rows were updated, insert a new session
        if (updateResult.changes === 0) {
            await runQuery(`
                INSERT INTO sessions (user_id, site_id, last_claim_at, session_data)
                VALUES (?, ?, ?, ?)
            `, [user_id, site_id, last_claim_at, JSON.stringify(session_data)]);
        }
        
        res.json({ message: 'Session updated successfully' });
    } catch (error) {
        console.error('Error updating session:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get user session data
app.get('/api/sessions/:user_id/:site_id', async (req, res) => {
    const { user_id, site_id } = req.params;
    
    try {
        const session = await getQuery(`
            SELECT * FROM sessions 
            WHERE user_id = ? AND site_id = ?
        `, [user_id, site_id]);
        
        if (!session) {
            return res.json({
                user_id: parseInt(user_id),
                site_id,
                last_claim_at: null,
                last_visit_at: null,
                session_data: {}
            });
        }
        
        session.session_data = session.session_data ? JSON.parse(session.session_data) : {};
        
        res.json(session);
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
initializeDatabase()
    .then(async () => {
        // Create a test user if none exists
        try {
            const existingUser = await getQuery('SELECT id FROM users LIMIT 1');
            if (!existingUser) {
                console.log('👤 Creating test user...');
                const testPassword = await bcrypt.hash('test123', 10);
                
                const result = await runQuery(`
                    INSERT INTO users (username, email, password_hash, display_name)
                    VALUES (?, ?, ?, ?)
                `, ['testuser', 'test@example.com', testPassword, 'Test User']);
                
                await createUserBalance(result.id);
                
                console.log(`✅ Test user created with ID: ${result.id}`);
                console.log('   Username: testuser');
                console.log('   Password: test123');
                console.log('   Email: test@example.com');
            }
        } catch (error) {
            console.log('ℹ️  Test user creation skipped:', error.message);
        }
        
        // Start server
        app.listen(PORT, () => {
            console.log(`🗄️  Database API server (SQLite) running on port ${PORT}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log(`📊 Ready to handle centralized database operations`);
            console.log(`📁 Database file: ${dbPath}`);
        });
    })
    .catch(error => {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    });

module.exports = app;

