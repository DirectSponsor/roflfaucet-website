-- Centralized Database Schema for Multi-Site Gamification (SQLite Version)
-- This replaces complex OAuth API calls with simple database operations

-- Users table - Core user information
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    -- OAuth integration fields
    oauth_provider TEXT DEFAULT 'directsponsor',
    oauth_user_id TEXT,
    -- Profile fields
    avatar_url TEXT,
    bio TEXT,
    timezone TEXT DEFAULT 'UTC'
);

-- Balances table - Token/coin balances for each user
CREATE TABLE IF NOT EXISTS balances (
    user_id INTEGER PRIMARY KEY,
    -- Cross-site ecosystem currency
    useless_coin_balance DECIMAL(15, 2) DEFAULT 0,
    -- Site-specific tokens
    roflfaucet_tokens DECIMAL(15, 2) DEFAULT 0,
    clickforcharity_tokens DECIMAL(15, 2) DEFAULT 0,
    -- Tracking fields
    total_earned DECIMAL(15, 2) DEFAULT 0,
    total_spent DECIMAL(15, 2) DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Activities table - Track all user activities across sites
CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    site_id TEXT NOT NULL, -- 'roflfaucet', 'clickforcharity', etc.
    activity_type TEXT NOT NULL, -- 'claim', 'visit', 'read_article', 'social_action'
    -- Reward tracking
    tokens_awarded DECIMAL(10, 2) DEFAULT 0,
    coins_awarded DECIMAL(10, 2) DEFAULT 0,
    -- Activity details
    description TEXT,
    metadata TEXT, -- Store flexible activity data as JSON string
    -- Timing
    activity_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tasks table - Define available tasks/goals users can complete
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL, -- 'daily', 'weekly', 'achievement', 'milestone'
    -- Rewards
    token_reward DECIMAL(10, 2) DEFAULT 0,
    coin_reward DECIMAL(10, 2) DEFAULT 0,
    -- Conditions
    site_id TEXT, -- NULL for cross-site tasks
    requirements TEXT, -- Flexible requirements definition as JSON string
    -- Status
    is_active BOOLEAN DEFAULT 1,
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User_tasks table - Track user progress on tasks
CREATE TABLE IF NOT EXISTS user_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    -- Progress tracking
    progress DECIMAL(5, 2) DEFAULT 0, -- Percentage complete (0-100)
    is_completed BOOLEAN DEFAULT 0,
    completed_at DATETIME NULL,
    -- Timing
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Constraints
    UNIQUE(user_id, task_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Achievements table - Special milestones and badges
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    badge_icon TEXT, -- Icon/image for the achievement
    -- Requirements
    requirement_type TEXT, -- 'total_claims', 'consecutive_days', 'social_actions', etc.
    requirement_value INTEGER, -- Threshold value
    site_id TEXT, -- NULL for cross-site achievements
    -- Rewards
    token_reward DECIMAL(10, 2) DEFAULT 0,
    coin_reward DECIMAL(10, 2) DEFAULT 0,
    -- Status
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User_achievements table - Track earned achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Constraints
    UNIQUE(user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
);

-- Sessions table - Track user sessions and timing data
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    site_id TEXT NOT NULL,
    -- Timing data
    last_claim_at DATETIME NULL,
    last_visit_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_data TEXT, -- Store session-specific data as JSON string
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- System_stats table - Track overall system statistics
CREATE TABLE IF NOT EXISTS system_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id TEXT NOT NULL,
    stat_name TEXT NOT NULL,
    stat_value DECIMAL(15, 2) NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Constraints
    UNIQUE(site_id, stat_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_activities_site_date ON activities(site_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_activities_type_date ON activities(activity_type, activity_date);
CREATE INDEX IF NOT EXISTS idx_sessions_user_site ON sessions(user_id, site_id);

-- Insert initial system stats
INSERT OR REPLACE INTO system_stats (site_id, stat_name, stat_value) VALUES
('roflfaucet', 'total_users', 0),
('roflfaucet', 'total_claims', 0),
('roflfaucet', 'total_tokens_distributed', 0),
('global', 'total_coins_distributed', 0),
('global', 'active_users_today', 0);

-- Insert some default achievements
INSERT OR REPLACE INTO achievements (id, name, description, requirement_type, requirement_value, site_id, token_reward, coin_reward) VALUES
(1, 'First Claim', 'Made your first faucet claim!', 'total_claims', 1, 'roflfaucet', 5, 1),
(2, 'Regular User', 'Made 10 successful claims', 'total_claims', 10, 'roflfaucet', 20, 5),
(3, 'Faucet Veteran', 'Made 100 successful claims', 'total_claims', 100, 'roflfaucet', 100, 25),
(4, 'Multi-Site Explorer', 'Visited multiple sites in the ecosystem', 'sites_visited', 2, NULL, 50, 10);

-- Insert some default tasks
INSERT OR REPLACE INTO tasks (id, name, description, task_type, site_id, token_reward, coin_reward, requirements) VALUES
(1, 'Daily Claim', 'Make a faucet claim today', 'daily', 'roflfaucet', 5, 1, '{"max_per_day": 1}'),
(2, 'Weekly Visitor', 'Visit the site 5 times this week', 'weekly', 'roflfaucet', 25, 5, '{"visits_required": 5}'),
(3, 'Social Sharer', 'Share content on social media', 'achievement', NULL, 15, 3, '{"platforms": ["twitter", "facebook", "reddit"]}');

