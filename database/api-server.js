const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.DB_API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gamification_db',
    // Connection pool settings
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Helper functions
async function getUserById(userId) {
    const [rows] = await pool.execute(`
        SELECT u.*, b.* 
        FROM users u 
        LEFT JOIN balances b ON u.id = b.user_id 
        WHERE u.id = ?
    `, [userId]);
    return rows[0] || null;
}

async function getUserByUsername(username) {
    const [rows] = await pool.execute(`
        SELECT u.*, b.* 
        FROM users u 
        LEFT JOIN balances b ON u.id = b.user_id 
        WHERE u.username = ?
    `, [username]);
    return rows[0] || null;
}

async function createUserBalance(userId) {
    await pool.execute(`
        INSERT INTO balances (user_id) VALUES (?)
        ON DUPLICATE KEY UPDATE user_id = user_id
    `, [userId]);
}

// API Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Centralized Database API'
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
        const [result] = await pool.execute(`
            INSERT INTO users (username, email, password_hash, display_name)
            VALUES (?, ?, ?, ?)
        `, [username, email, password_hash, display_name || username]);
        
        const userId = result.insertId;
        
        // Create balance record
        await createUserBalance(userId);
        
        // Get the complete user record
        const newUser = await getUserById(userId);
        delete newUser.password_hash;
        
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.code === 'ER_DUP_ENTRY') {
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
        await pool.execute(`
            UPDATE balances 
            SET 
                useless_coin_balance = useless_coin_balance + ?,
                roflfaucet_tokens = roflfaucet_tokens + ?,
                clickforcharity_tokens = clickforcharity_tokens + ?,
                total_earned = total_earned + ? + ? + ?
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
        const [result] = await pool.execute(`
            INSERT INTO activities (user_id, site_id, activity_type, tokens_awarded, coins_awarded, description, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [user_id, site_id, activity_type, tokens_awarded, coins_awarded, description, JSON.stringify(metadata)]);
        
        // Update user balances if rewards were given
        if (tokens_awarded > 0 || coins_awarded > 0) {
            const balanceUpdate = {};
            if (coins_awarded > 0) balanceUpdate.useless_coin_increment = coins_awarded;
            if (tokens_awarded > 0 && site_id === 'roflfaucet') balanceUpdate.roflfaucet_tokens_increment = tokens_awarded;
            if (tokens_awarded > 0 && site_id === 'clickforcharity') balanceUpdate.clickforcharity_tokens_increment = tokens_awarded;
            
            if (Object.keys(balanceUpdate).length > 0) {
                await pool.execute(`
                    UPDATE balances 
                    SET 
                        useless_coin_balance = useless_coin_balance + ?,
                        roflfaucet_tokens = roflfaucet_tokens + ?,
                        clickforcharity_tokens = clickforcharity_tokens + ?,
                        total_earned = total_earned + ? + ?
                    WHERE user_id = ?
                `, [
                    balanceUpdate.useless_coin_increment || 0,
                    balanceUpdate.roflfaucet_tokens_increment || 0,
                    balanceUpdate.clickforcharity_tokens_increment || 0,
                    tokens_awarded,
                    coins_awarded,
                    user_id
                ]);
            }
        }
        
        res.status(201).json({ 
            id: result.insertId,
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
        let query = `
            SELECT * FROM activities 
            WHERE user_id = ?
        `;
        let params = [userId];
        
        if (site_id) {
            query += ` AND site_id = ?`;
            params.push(site_id);
        }
        
        query += ` ORDER BY activity_date DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        
        const [rows] = await pool.execute(query, params);
        
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
        
        const [rows] = await pool.execute(`
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
            WHERE u.is_active = TRUE
            ORDER BY b.${orderColumn} DESC
            LIMIT ?
        `, [parseInt(limit)]);
        
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
        const [statsRows] = await pool.execute(`
            SELECT stat_name, stat_value 
            FROM system_stats 
            WHERE site_id = ? OR site_id = 'global'
        `, [siteId]);
        
        const stats = {};
        statsRows.forEach(row => {
            stats[row.stat_name] = parseFloat(row.stat_value);
        });
        
        // Calculate additional real-time stats
        const [userStats] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT u.id) as total_users,
                AVG(CASE WHEN b.${siteId}_tokens > 0 THEN b.${siteId}_tokens END) as avg_balance,
                MAX(b.${siteId}_tokens) as top_balance
            FROM users u
            LEFT JOIN balances b ON u.id = b.user_id
            WHERE u.is_active = TRUE
        `);
        
        const [activityStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total_activities,
                SUM(tokens_awarded) as total_tokens_distributed,
                SUM(coins_awarded) as total_coins_distributed
            FROM activities
            WHERE site_id = ?
        `, [siteId]);
        
        res.json({
            ...stats,
            total_users: userStats[0].total_users || 0,
            avg_balance: userStats[0].avg_balance || 0,
            top_balance: userStats[0].top_balance || 0,
            total_activities: activityStats[0].total_activities || 0,
            site_tokens_distributed: activityStats[0].total_tokens_distributed || 0,
            site_coins_distributed: activityStats[0].total_coins_distributed || 0,
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
        await pool.execute(`
            INSERT INTO sessions (user_id, site_id, last_claim_at, session_data)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                last_visit_at = CURRENT_TIMESTAMP,
                last_claim_at = COALESCE(?, last_claim_at),
                session_data = ?
        `, [
            user_id, 
            site_id, 
            last_claim_at, 
            JSON.stringify(session_data),
            last_claim_at,
            JSON.stringify(session_data)
        ]);
        
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
        const [rows] = await pool.execute(`
            SELECT * FROM sessions 
            WHERE user_id = ? AND site_id = ?
        `, [user_id, site_id]);
        
        if (rows.length === 0) {
            return res.json({
                user_id: parseInt(user_id),
                site_id,
                last_claim_at: null,
                last_visit_at: null,
                session_data: {}
            });
        }
        
        const session = rows[0];
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

// Start server
app.listen(PORT, () => {
    console.log(`🗄️  Database API server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Ready to handle centralized database operations`);
});

module.exports = app;

