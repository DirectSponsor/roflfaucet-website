-- Centralized Database Schema for Multi-Site Gamification
-- This replaces complex OAuth API calls with simple database operations

-- Users table - Core user information
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    -- OAuth integration fields
    oauth_provider VARCHAR(50) DEFAULT 'directsponsor',
    oauth_user_id VARCHAR(255),
    -- Profile fields
    avatar_url TEXT,
    bio TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC'
);

-- Balances table - Token/coin balances for each user
CREATE TABLE balances (
    user_id INT PRIMARY KEY,
    -- Cross-site ecosystem currency
    useless_coin_balance DECIMAL(15, 2) DEFAULT 0,
    -- Site-specific tokens
    roflfaucet_tokens DECIMAL(15, 2) DEFAULT 0,
    clickforcharity_tokens DECIMAL(15, 2) DEFAULT 0,
    -- Tracking fields
    total_earned DECIMAL(15, 2) DEFAULT 0,
    total_spent DECIMAL(15, 2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Activities table - Track all user activities across sites
CREATE TABLE activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    site_id VARCHAR(50) NOT NULL, -- 'roflfaucet', 'clickforcharity', etc.
    activity_type VARCHAR(100) NOT NULL, -- 'claim', 'visit', 'read_article', 'social_action'
    -- Reward tracking
    tokens_awarded DECIMAL(10, 2) DEFAULT 0,
    coins_awarded DECIMAL(10, 2) DEFAULT 0,
    -- Activity details
    description TEXT,
    metadata JSON, -- Store flexible activity data
    -- Timing
    activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Indexing
    INDEX idx_user_activities (user_id, activity_date),
    INDEX idx_site_activities (site_id, activity_date),
    INDEX idx_activity_type (activity_type, activity_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tasks table - Define available tasks/goals users can complete
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(100) NOT NULL, -- 'daily', 'weekly', 'achievement', 'milestone'
    -- Rewards
    token_reward DECIMAL(10, 2) DEFAULT 0,
    coin_reward DECIMAL(10, 2) DEFAULT 0,
    -- Conditions
    site_id VARCHAR(50), -- NULL for cross-site tasks
    requirements JSON, -- Flexible requirements definition
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMP NULL,
    ends_at TIMESTAMP NULL,
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Indexing
    INDEX idx_active_tasks (is_active, site_id),
    INDEX idx_task_timing (starts_at, ends_at)
);

-- User_tasks table - Track user progress on tasks
CREATE TABLE user_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id INT NOT NULL,
    -- Progress tracking
    progress DECIMAL(5, 2) DEFAULT 0, -- Percentage complete (0-100)
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Constraints
    UNIQUE KEY unique_user_task (user_id, task_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    -- Indexing
    INDEX idx_user_progress (user_id, is_completed),
    INDEX idx_task_progress (task_id, is_completed)
);

-- Achievements table - Special milestones and badges
CREATE TABLE achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    badge_icon VARCHAR(255), -- Icon/image for the achievement
    -- Requirements
    requirement_type VARCHAR(100), -- 'total_claims', 'consecutive_days', 'social_actions', etc.
    requirement_value INT, -- Threshold value
    site_id VARCHAR(50), -- NULL for cross-site achievements
    -- Rewards
    token_reward DECIMAL(10, 2) DEFAULT 0,
    coin_reward DECIMAL(10, 2) DEFAULT 0,
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Indexing
    INDEX idx_active_achievements (is_active, site_id)
);

-- User_achievements table - Track earned achievements
CREATE TABLE user_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Constraints
    UNIQUE KEY unique_user_achievement (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    -- Indexing
    INDEX idx_user_achievements (user_id, earned_at),
    INDEX idx_achievement_earners (achievement_id, earned_at)
);

-- Sessions table - Track user sessions and timing data
CREATE TABLE sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    site_id VARCHAR(50) NOT NULL,
    -- Timing data
    last_claim_at TIMESTAMP NULL,
    last_visit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_data JSON, -- Store session-specific data
    -- Indexing
    INDEX idx_user_sessions (user_id, site_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- System_stats table - Track overall system statistics
CREATE TABLE system_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id VARCHAR(50) NOT NULL,
    stat_name VARCHAR(100) NOT NULL,
    stat_value DECIMAL(15, 2) NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Constraints
    UNIQUE KEY unique_site_stat (site_id, stat_name),
    -- Indexing
    INDEX idx_site_stats (site_id, stat_name)
);

-- Insert initial system stats
INSERT INTO system_stats (site_id, stat_name, stat_value) VALUES
('roflfaucet', 'total_users', 0),
('roflfaucet', 'total_claims', 0),
('roflfaucet', 'total_tokens_distributed', 0),
('global', 'total_coins_distributed', 0),
('global', 'active_users_today', 0);

-- Insert some default achievements
INSERT INTO achievements (name, description, requirement_type, requirement_value, site_id, token_reward, coin_reward) VALUES
('First Claim', 'Made your first faucet claim!', 'total_claims', 1, 'roflfaucet', 5, 1),
('Regular User', 'Made 10 successful claims', 'total_claims', 10, 'roflfaucet', 20, 5),
('Faucet Veteran', 'Made 100 successful claims', 'total_claims', 100, 'roflfaucet', 100, 25),
('Multi-Site Explorer', 'Visited multiple sites in the ecosystem', 'sites_visited', 2, NULL, 50, 10);

-- Insert some default tasks
INSERT INTO tasks (name, description, task_type, site_id, token_reward, coin_reward, requirements) VALUES
('Daily Claim', 'Make a faucet claim today', 'daily', 'roflfaucet', 5, 1, '{"max_per_day": 1}'),
('Weekly Visitor', 'Visit the site 5 times this week', 'weekly', 'roflfaucet', 25, 5, '{"visits_required": 5}'),
('Social Sharer', 'Share content on social media', 'achievement', NULL, 15, 3, '{"platforms": ["twitter", "facebook", "reddit"]}');

