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
  crossOriginEmbedderPolicy: false, // Allow YouTube embeds
  crossOriginOpenerPolicy: false,   // Allow cross-origin popups
  crossOriginResourcePolicy: false  // Allow cross-origin resources
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (index.html, script.js, etc.) with proper MIME types
app.use(express.static(path.join(__dirname, '..'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// In-memory storage for development (will replace with database later)
const users = new Map();
const claims = new Map();

// Initialize content managers
const videoManager = new AutoVideoManager();
const imageManager = new AutoImageManager();
const mediaManager = new EnhancedMediaManager();

// Helper functions
function generateUserId() {
  return 'user_' + Math.random().toString(36).substr(2, 9);
}

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

  // Use test keys for development
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

// API Routes

// Get user info
app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  const user = users.get(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    userId: user.id,
    username: user.username,
    balance: user.balance,
    totalClaims: user.totalClaims,
    lastClaim: claims.get(userId) ? new Date(claims.get(userId)) : null,
    nextClaimAvailable: getNextClaimTime(userId),
    canClaim: canClaim(userId)
  });
});

// OAuth-only authentication
// All users are created and managed through DirectSponsor OAuth

// Claim tokens (works with OAuth users)
app.post('/api/claim', async (req, res) => {
  const { userId, captchaToken } = req.body;
  
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
  
  // Check or create OAuth user
  let user = users.get(userId);
  if (!user) {
    // Create a new user on first claim via OAuth
    user = {
      id: userId,
      username: `OAuth_User_${userId.substring(0, 8)}`, // Placeholder, frontend will update
      balance: 0,
      totalClaims: 0,
      createdAt: Date.now()
    };
    users.set(userId, user);
    console.log('Created new OAuth user profile on first claim:', user);
  }
  
  if (!canClaim(userId)) {
    const nextClaim = getNextClaimTime(userId);
    return res.status(429).json({ 
      error: 'Claim cooldown active',
      nextClaimAvailable: nextClaim,
      message: `You can claim again at ${nextClaim.toLocaleTimeString()}`
    });
  }
  
  // Award exactly 5 tokens per claim
  const tokensAwarded = 5;
  
  // Update user
  user.balance += tokensAwarded;
  user.totalClaims += 1;
  users.set(userId, user);
  
  // Record claim time
  claims.set(userId, Date.now());
  
  res.json({
    success: true,
    tokensAwarded,
    newBalance: user.balance,
    totalClaims: user.totalClaims,
    nextClaimAvailable: getNextClaimTime(userId),
    message: `Congratulations! You earned ${tokensAwarded} UselessCoins!`
  });
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  const topUsers = Array.from(users.values())
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 10)
    .map(user => ({
      username: user.username,
      balance: user.balance,
      totalClaims: user.totalClaims
    }));
  
  res.json({ leaderboard: topUsers });
});

// Get faucet stats
app.get('/api/stats', (req, res) => {
  const totalUsers = users.size;
  const totalClaims = Array.from(users.values()).reduce((sum, user) => sum + user.totalClaims, 0);
  const totalTokens = Array.from(users.values()).reduce((sum, user) => sum + user.balance, 0);
  
  res.json({
    totalUsers,
    totalClaims,
    totalTokensDistributed: totalTokens,
    averageBalance: totalUsers > 0 ? Math.round(totalTokens / totalUsers) : 0
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Video API endpoints
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

// Image API endpoints
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

// Enhanced Media API endpoints (Imgur + Smart Format Selection)
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

// =============================================================================
// OAuth Integration with DirectSponsor Authentication
// =============================================================================

// OAuth configuration
const OAUTH_CONFIG = {
    clientId: 'roflfaucet',
    clientSecret: 'a3aad8f798c2e668791d08de9d2eaeec91fd6b108c7d5a8797eb9358d95bed98', // Must match DirectSponsor config
    directSponsorBaseUrl: 'https://auth.directsponsor.org',
    redirectUri: process.env.SITE_URL + '/auth/callback' || 'http://localhost:3000/auth/callback'
};

// Token exchange endpoint
app.post('/api/oauth/token', async (req, res) => {
    const { code, redirect_uri } = req.body;
    
    if (!code || !redirect_uri) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    try {
        // Exchange authorization code for access token with DirectSponsor
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
        
        // Return tokens to client
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

// User info proxy endpoint
app.get('/api/oauth/userinfo', async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    
    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
        // Get user info from DirectSponsor
        const userResponse = await axios.get(`${OAUTH_CONFIG.directSponsorBaseUrl}/oauth/userinfo`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const userData = userResponse.data;
        console.log('DirectSponsor userinfo response:', userData);
        
        // Handle incomplete DirectSponsor response
        let userId = userData.id || userData.user_id || userData.uid;
        let username = userData.username || userData.display_name || userData.name;
        
        // TEMPORARY WORKAROUND: DirectSponsor server incomplete
        if (!userId || !username) {
            console.warn('⚠️  TEMPORARY: DirectSponsor missing user profile data');
            console.warn('DirectSponsor response:', JSON.stringify(userData, null, 2));
            
            // Create consistent temporary ID that can be migrated later
            const tokenHash = require('crypto').createHash('sha256').update(accessToken).digest('hex');
            const tempUserId = 'temp_ds_' + tokenHash.substring(0, 16);
            const tempUsername = 'TempUser_' + tokenHash.substring(0, 8);
            
            // Store mapping for future migration
            const migrationData = {
                temporaryId: tempUserId,
                accessTokenHash: tokenHash.substring(0, 32), // For identification
                createdAt: new Date().toISOString(),
                directSponsorResponse: userData,
                needsMigration: true
            };
            
            // Log for future migration (in production, store in database)
            console.warn('🔄 Created temporary user requiring migration:', migrationData);
            
            // Return temporary user data with clear indication
            return res.json({
                id: tempUserId,
                username: tempUsername,
                email: `${tempUserId}@temp.directsponsor.local`,
                display_name: tempUsername,
                useless_coin_balance: userData.useless_coin_balance || 0,
                _temporary: true, // Flag for frontend
                _migrationRequired: true // Flag for future fixes
            });
        }
        
        // Normal response when DirectSponsor provides complete data
        res.json({
            id: userId,
            username: username,
            email: userData.email || `${userId}@directsponsor.org`,
            display_name: userData.display_name || username,
            useless_coin_balance: userData.useless_coin_balance || 0,
            _temporary: false
        });
        
    } catch (error) {
        console.error('OAuth userinfo failed:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            res.status(401).json({ error: 'Invalid or expired access token' });
        } else {
            res.status(500).json({ error: 'Failed to fetch user info' });
        }
    }
});

// OAuth token refresh endpoint
app.post('/api/oauth/refresh', async (req, res) => {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    try {
        // Exchange refresh token for new access token with DirectSponsor
        const tokenParams = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: OAUTH_CONFIG.clientId,
            client_secret: OAUTH_CONFIG.clientSecret,
            refresh_token: refresh_token
        });
        
        const tokenResponse = await axios.post(`${OAUTH_CONFIG.directSponsorBaseUrl}/oauth/token`, tokenParams, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        const tokenData = tokenResponse.data;
        
        // Return new tokens to client
        res.json({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || refresh_token, // Keep old refresh token if new one not provided
            expires_in: tokenData.expires_in,
            token_type: tokenData.token_type,
            scope: tokenData.scope
        });
        
    } catch (error) {
        console.error('OAuth token refresh failed:', (error.response && error.response.data) || error.message);
        
        if (error.response && error.response.data) {
            res.status(400).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Token refresh failed' });
        }
    }
});

// OAuth callback route (serves the callback page)
app.get('/auth/callback', (req, res) => {
    // Serve dedicated callback page without hCaptcha conflicts
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, '..', 'callback.html'));
});

// =============================================================================
// Serve the main page for all other routes (but not static files)
app.get('*', (req, res) => {
  // Don't serve HTML for static file requests
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
  console.log(`🎲 ROFLFaucet server running on port ${PORT}`);
  console.log(`📱 Visit: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api/health`);
  console.log(`🎥 Video API: http://localhost:${PORT}/api/video/random`);
  console.log(`🖼️  Image API: http://localhost:${PORT}/api/image/random`);
  console.log(`🎬 Enhanced Media API: http://localhost:${PORT}/api/media/random`);
  console.log(`💰 Ready to dispense UselessCoins!`);
  console.log(`🤖 Auto video discovery system starting...`);
  console.log(`🎨 Auto image discovery system starting...`);
  console.log(`🚀 Enhanced media manager with Imgur integration starting...`);
});

module.exports = app;

