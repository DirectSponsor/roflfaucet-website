const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const axios = require('axios');
const AutoVideoManager = require('./videoManager');
const AutoImageManager = require('./imageManager');
const EnhancedMediaManager = require('./mediaManager');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database API configuration
const DB_API_BASE_URL = process.env.DB_API_BASE_URL || 'http://localhost:3001';

// OAuth configuration (kept for authentication only)
const OAUTH_CONFIG = {
    clientId: 'roflfaucet',
    clientSecret: 'a3aad8f798c2e668791d08de9d2eaeec91fd6b108c7d5a8797eb9358d95bed98',
    directSponsorBaseUrl: 'https://auth.directsponsor.org',
    redirectUri: process.env.SITE_URL + '/auth/callback' || 'http://localhost:3000/auth/callback'
};

// Security and middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.hcaptcha.com", "https://s.imgur.com", "https://imgur.com", "https://*.imgur.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "data:", "https:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://youtube.com", "https://hcaptcha.com", "https://*.hcaptcha.com", "https://imgur.com", "https://*.imgur.com", "https://i.imgur.com", "https://s.imgur.com", "https://embed.imgur.com", "https://giphy.com", "https://*.giphy.com", "https://embed.giphy.com"],
      connectSrc: ["'self'", "https://hcaptcha.com", "https://*.hcaptcha.com"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '..'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Temporary claim timing data (simple in-memory store)
const claims = new Map();

// Initialize content managers
const videoManager = new AutoVideoManager();
const imageManager = new AutoImageManager();
const mediaManager = new EnhancedMediaManager();

// Helper functions
function canClaim(userId) {
  const lastClaim = claims.get(userId);
  if (!lastClaim) return true;
  
  const now = Date.now();
  const timeDiff = now - lastClaim;
  const cooldownTime = 60 * 60 * 1000; // 1 hour in milliseconds
  
  return timeDiff >= cooldownTime;
}

function getNextClaimTime(userId) {
  const lastClaim = claims.get(userId);
  if (!lastClaim) return null;
  
  const cooldownTime = 60 * 60 * 1000; // 1 hour
  return new Date(lastClaim + cooldownTime);
}

// hCaptcha verification
async function verifyCaptcha(token) {
  if (!token) {
    return { success: false, error: 'Captcha token is required' };
  }

  // Allow test tokens for development
  if (token.startsWith('test_token_')) {
    console.log('Accepting test token for development:', token);
    return { success: true, testMode: true };
  }

  const secretKey = process.env.HCAPTCHA_SECRET_KEY || '0x0000000000000000000000000000000000000000';

  try {
    const response = await axios.post('https://hcaptcha.com/siteverify', 
      `response=${token}&secret=${secretKey}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (response.data.success) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: 'Captcha verification failed',
        details: response.data['error-codes']
      };
    }
  } catch (error) {
    console.error('Captcha verification error:', error);
    return { 
      success: false, 
      error: 'Captcha verification service unavailable'
    };
  }
}

// Database API helper functions
async function dbApiCall(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${DB_API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Database API call failed (${method} ${endpoint}):`, error.response?.data || error.message);
    throw error;
  }
}

// API Routes

// Get user data from centralized database
app.get('/api/user/:id', async (req, res) => {
  const userId = req.params.id;
  
  try {
    const userData = await dbApiCall(`/api/users/${userId}`);
    
    res.json({
      userId: userData.id,
      username: userData.username || userData.display_name || 'Unknown',
      email: userData.email,
      coinBalance: userData.useless_coin_balance || 0,
      tokenBalance: userData.roflfaucet_tokens || 0,
      totalEarned: userData.total_earned || 0,
      lastClaim: claims.get(userId) ? new Date(claims.get(userId)) : null,
      nextClaimAvailable: getNextClaimTime(userId),
      canClaim: canClaim(userId),
      _source: 'Centralized Database (direct)'
    });
    
  } catch (error) {
    console.error('Failed to fetch user data from database:', error.response?.data || error.message);
    
    res.status(500).json({
      error: 'Failed to fetch user data',
      details: error.response?.data || error.message
    });
  }
});

// Claim tokens - directly update database
app.post('/api/claim', async (req, res) => {
  const { userId, captchaToken, accessToken } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  // Verify captcha
  const captchaResult = await verifyCaptcha(captchaToken);
  if (!captchaResult.success) {
    return res.status(400).json({ 
      error: captchaResult.error,
      captchaError: true
    });
  }
  
  if (!canClaim(userId)) {
    const nextClaim = getNextClaimTime(userId);
    return res.status(429).json({ 
      error: 'Claim cooldown active',
      nextClaimAvailable: nextClaim,
      message: `You can claim again at ${nextClaim.toLocaleTimeString()}`
    });
  }
  
  try {
    const tokensAwarded = 5;
    const coinsAwarded = 1;
    
    // Record the activity in the database
    await dbApiCall('/api/activities', 'POST', {
      user_id: userId,
      site_id: 'roflfaucet',
      activity_type: 'claim',
      tokens_awarded: tokensAwarded,
      coins_awarded: coinsAwarded,
      description: 'Faucet claim reward',
      metadata: {
        captcha_verified: true,
        timestamp: new Date().toISOString()
      }
    });
    
    // Record claim time locally
    claims.set(userId, Date.now());
    
    // Get updated user data
    const updatedUser = await dbApiCall(`/api/users/${userId}`);
    
    console.log('✅ Successfully awarded tokens via direct database update');
    
    res.json({
      success: true,
      message: `Congratulations! You earned ${tokensAwarded} WorthlessTokens and ${coinsAwarded} UselessCoins!`,
      tokensAwarded: tokensAwarded,
      coinsAwarded: coinsAwarded,
      newTokenBalance: updatedUser.roflfaucet_tokens,
      newCoinBalance: updatedUser.useless_coin_balance,
      userId: userId,
      nextClaimAvailable: getNextClaimTime(userId),
      _source: 'Centralized Database (direct)'
    });
    
  } catch (error) {
    console.error('Failed to process claim:', error.response?.data || error.message);
    
    res.status(500).json({
      error: 'Failed to process claim',
      details: error.response?.data || error.message
    });
  }
});

// Get leaderboard from centralized database
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await dbApiCall('/api/leaderboard?site_id=roflfaucet&type=tokens&limit=50');
    
    res.json({
      leaderboard: leaderboard || [],
      _source: 'Centralized Database (direct)'
    });
    
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error.response?.data || error.message);
    
    // Fallback response
    res.json({
      leaderboard: [],
      error: 'Leaderboard temporarily unavailable',
      _note: 'Database API temporarily down'
    });
  }
});

// Get faucet stats from centralized database
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await dbApiCall('/api/stats/roflfaucet');
    
    res.json({
      activeGameUsers: stats.total_users || 0,
      totalClaims: stats.total_activities || 0,
      totalTokensDistributed: stats.site_tokens_distributed || 0,
      averageBalance: stats.avg_balance || 0,
      topUserBalance: stats.top_balance || 0,
      lastUpdated: stats.last_updated,
      _source: 'Centralized Database (direct)'
    });
    
  } catch (error) {
    console.error('Failed to fetch stats:', error.response?.data || error.message);
    
    // Fallback mock data
    res.json({
      activeGameUsers: 0,
      totalClaims: 0,
      totalTokensDistributed: 0,
      averageBalance: 0,
      topUserBalance: 0,
      lastUpdated: new Date().toISOString(),
      _source: 'Fallback data (database unavailable)',
      error: 'Database API temporarily unavailable'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    architecture: 'simplified-direct-database'
  });
});

// Video API endpoints (unchanged)
app.get('/api/video/random', (req, res) => {
  try {
    const video = videoManager.getRandomVideo();
    res.json(video);
  } catch (error) {
    console.error('Error getting random video:', error);
    res.status(500).json({ error: 'Failed to get video' });
  }
});

app.get('/api/video/stats', (req, res) => {
  try {
    const stats = videoManager.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting video stats:', error);
    res.status(500).json({ error: 'Failed to get video stats' });
  }
});

app.post('/api/video/refresh', (req, res) => {
  videoManager.forceRefresh()
    .then(stats => {
      res.json({ message: 'Video cache refreshed successfully', stats });
    })
    .catch(error => {
      console.error('Error refreshing video cache:', error);
      res.status(500).json({ error: 'Failed to refresh video cache' });
    });
});

// Image API endpoints (unchanged)
app.get('/api/image/random', (req, res) => {
  try {
    const image = imageManager.getRandomImage();
    res.json(image);
  } catch (error) {
    console.error('Error getting random image:', error);
    res.status(500).json({ error: 'Failed to get image' });
  }
});

app.get('/api/image/stats', (req, res) => {
  try {
    const stats = imageManager.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting image stats:', error);
    res.status(500).json({ error: 'Failed to get image stats' });
  }
});

app.post('/api/image/refresh', (req, res) => {
  imageManager.forceRefresh()
    .then(stats => {
      res.json({ message: 'Image cache refreshed successfully', stats });
    })
    .catch(error => {
      console.error('Error refreshing image cache:', error);
      res.status(500).json({ error: 'Failed to refresh image cache' });
    });
});

// Enhanced Media API endpoints (unchanged)
app.get('/api/media/random', (req, res) => {
  try {
    const media = mediaManager.getRandomMedia();
    res.json(media);
  } catch (error) {
    console.error('Error getting random media:', error);
    res.status(500).json({ error: 'Failed to get media' });
  }
});

app.get('/api/media/stats', (req, res) => {
  try {
    const stats = mediaManager.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting media stats:', error);
    res.status(500).json({ error: 'Failed to get media stats' });
  }
});

app.post('/api/media/refresh', async (req, res) => {
  try {
    const stats = await mediaManager.forceRefresh();
    res.json({ 
      success: true, 
      message: 'Media cache refreshed successfully',
      stats 
    });
  } catch (error) {
    console.error('Error refreshing media cache:', error);
    res.status(500).json({ error: 'Failed to refresh media cache' });
  }
});

// OAuth Integration (kept for authentication only)
app.post('/api/oauth/token', async (req, res) => {
    const { code, redirect_uri } = req.body;
    
    if (!code || !redirect_uri) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    try {
        const tokenParams = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: OAUTH_CONFIG.clientId,
            client_secret: OAUTH_CONFIG.clientSecret,
            code: code,
            redirect_uri: redirect_uri
        });
        
        const tokenResponse = await axios.post(`${OAUTH_CONFIG.directSponsorBaseUrl}/oauth/token`, tokenParams, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        const tokenData = tokenResponse.data;
        
        res.json({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
            token_type: tokenData.token_type,
            scope: tokenData.scope
        });
        
    } catch (error) {
        console.error('OAuth token exchange failed:', (error.response && error.response.data) || error.message);
        
        if (error.response && error.response.data) {
            res.status(400).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Token exchange failed' });
        }
    }
});

// OAuth callback route
app.get('/auth/callback', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, '..', 'callback.html'));
});

// Serve the main page for all other routes
app.get('*', (req, res) => {
  if (req.path.includes('.css') || req.path.includes('.js') || req.path.includes('.json') || req.path.includes('.ico')) {
    return res.status(404).send('File not found');
  }
  res.setHeader('Content-Type', 'text/html');
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎲 ROFLFaucet server (SIMPLIFIED) running on port ${PORT}`);
  console.log(`📱 Visit: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api/health`);
  console.log(`🗄️  Database API: ${DB_API_BASE_URL}`);
  console.log(`💰 Ready to dispense tokens via direct database!`);
  console.log(`📊 Architecture: Simplified Direct Database Integration`);
});

module.exports = app;

