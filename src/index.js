const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const axios = require('axios');
const AutoVideoManager = require('./videoManager');
const AutoImageManager = require('./imageManager');
const EnhancedMediaManager = require('./mediaManager');
require('dotenv').config();

// OAuth configuration - must be defined before use
const OAUTH_CONFIG = {
    clientId: 'roflfaucet',
    clientSecret: 'a3aad8f798c2e668791d08de9d2eaeec91fd6b108c7d5a8797eb9358d95bed98', // Must match DirectSponsor config
    directSponsorBaseUrl: 'https://auth.directsponsor.org',
    redirectUri: process.env.SITE_URL + '/auth/callback' || 'http://localhost:3000/auth/callback'
};

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

// ⚠️  IMPORTANT: FULL CENTRALIZATION WITH DIRECTSPONSOR OAUTH
// ⚠️  ALL USER DATA IS STORED IN DIRECTSPONSOR OAUTH
// ⚠️  ROFLFaucet ONLY HANDLES GAME LOGIC - NO DATA STORAGE
// ⚠️  All user management and data storage goes through auth.directsponsor.org

// NO LOCAL USER DATA STORAGE
// All user data (identity, coins, tokens, achievements) stored in DirectSponsor OAuth
// ROFLFaucet is purely a game interface that reads/writes to OAuth server
const claims = new Map(); // Only temporary claim timing data (could also be moved to OAuth)

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

// Get user data from DirectSponsor OAuth (FULLY CENTRALIZED)
// ⚠️  ALL user data comes from DirectSponsor OAuth - no local storage
// ⚠️  ROFLFaucet is just a game interface to centralized data
app.get('/api/user/:id', async (req, res) => {
  const userId = req.params.id;
  
  try {
    // Get complete user data from DirectSponsor OAuth
    const userResponse = await axios.get(`${OAUTH_CONFIG.directSponsorBaseUrl}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${req.headers.authorization?.substring(7)}` // Remove 'Bearer ' prefix
      }
    });
    
    const userData = userResponse.data;
    
    res.json({
      userId: userId,
      username: userData.username || userData.display_name || 'Unknown',
      email: userData.email,
      coinBalance: userData.useless_coin_balance || 0, // Multi-site currency
      tokenBalance: userData.worthless_token_balance || 0, // ROFLFaucet-specific
      totalClaims: userData.roflfaucet_total_claims || 0,
      achievements: userData.roflfaucet_achievements || [],
      lastClaim: claims.get(userId) ? new Date(claims.get(userId)) : null,
      nextClaimAvailable: getNextClaimTime(userId),
      canClaim: canClaim(userId),
      _source: 'DirectSponsor OAuth (fully centralized)'
    });
    
  } catch (error) {
    console.error('Failed to fetch user data from DirectSponsor:', error.response?.data || error.message);
    
    res.status(500).json({
      error: 'Failed to fetch user data from centralized OAuth server',
      details: error.response?.data || error.message
    });
  }
});

// ⚠️  AUTHENTICATION WARNING: 
// ⚠️  ROFLFaucet does NOT handle user registration/login
// ⚠️  All authentication is handled by DirectSponsor OAuth at auth.directsponsor.org
// ⚠️  Users must be created there, not here

// OAuth-only authentication
// All users are created and managed through DirectSponsor OAuth
// ROFLFaucet only stores game-specific data (claims, achievements, etc.)

// Claim tokens (FULLY CENTRALIZED - updates DirectSponsor OAuth)
app.post('/api/claim', async (req, res) => {
  const { userId, captchaToken, accessToken } = req.body;
  
  if (!userId || !accessToken) {
    return res.status(400).json({ error: 'User ID and access token are required' });
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
    // Award tokens by updating DirectSponsor OAuth user data
    const tokensAwarded = 5;
    
    // Update user data in DirectSponsor OAuth
    const updateResponse = await axios.post(`https://auth.directsponsor.org/oauth/update-user`, {
      site_token_increment: tokensAwarded,
      site_claims_increment: 1,
      site_last_claim: Math.floor(Date.now() / 1000),
      useless_coin_increment: 1, // Award 1 ecosystem coin too
      total_claims_increment: 1,
      last_claim_timestamp: Math.floor(Date.now() / 1000),
      activity_type: 'claim',
      site_id: 'roflfaucet'
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Record claim time locally (could also be moved to OAuth)
    claims.set(userId, Date.now());
    
    console.log('✅ Successfully updated user data in DirectSponsor OAuth:', updateResponse.data);
    
    res.json({
      success: true,
      message: `Congratulations! You earned ${tokensAwarded} WorthlessTokens!`,
      tokensAwarded: tokensAwarded,
      newTokenBalance: updateResponse.data.worthless_token_balance,
      totalClaims: updateResponse.data.roflfaucet_total_claims,
      userId: userId,
      nextClaimAvailable: getNextClaimTime(userId),
      _source: 'Updated in DirectSponsor OAuth (fully centralized)'
    });
    
  } catch (error) {
    console.error('Failed to update user data in DirectSponsor:', error.response?.data || error.message);
    
    res.status(500).json({
      error: 'Failed to update user data in centralized OAuth server',
      details: error.response?.data || error.message
    });
  }
});

// Get leaderboard from DirectSponsor OAuth (FULLY CENTRALIZED)
app.get('/api/leaderboard', async (req, res) => {
  try {
    // Get access token from request
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required for leaderboard' });
    }
    
    // Get leaderboard data from DirectSponsor OAuth
    const leaderboardResponse = await axios.get('https://auth.directsponsor.org/oauth/leaderboard?site_id=roflfaucet&type=site_tokens', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    res.json({
      leaderboard: leaderboardResponse.data.leaderboard || [],
      user_rank: leaderboardResponse.data.user_rank,
      user_score: leaderboardResponse.data.user_score,
      total_entries: leaderboardResponse.data.total_entries,
      _source: 'DirectSponsor OAuth (fully centralized)'
    });
    
  } catch (error) {
    console.error('Failed to fetch leaderboard from DirectSponsor:', error.response?.data || error.message);
    
    // Fallback response if centralized leaderboard not available yet
    res.json({
      leaderboard: [],
      user_rank: null,
      user_score: 0,
      total_entries: 0,
      error: 'Leaderboard temporarily unavailable',
      _note: 'DirectSponsor OAuth leaderboard endpoint temporarily down'
    });
  }
});

// Get faucet stats from DirectSponsor OAuth (FULLY CENTRALIZED)
app.get('/api/stats', async (req, res) => {
  try {
    // Get stats from DirectSponsor OAuth
    const statsResponse = await axios.get(`${OAUTH_CONFIG.directSponsorBaseUrl}/oauth/stats/roflfaucet`, {
      headers: {
        'Authorization': `Bearer ${req.headers.authorization?.substring(7)}`
      }
    });
    
    res.json({
      ...statsResponse.data,
      _source: 'DirectSponsor OAuth (fully centralized)'
    });
    
  } catch (error) {
    console.error('Failed to fetch stats from DirectSponsor:', error.response?.data || error.message);
    
    // Return real stats from DirectSponsor backup endpoint
    try {
      const statsResponse = await axios.get('https://auth.directsponsor.org/oauth/stats?site_id=roflfaucet');
      
      // Handle response with potential leading whitespace
      let statsData;
      if (typeof statsResponse.data === 'string') {
        // Parse JSON from string response with whitespace trimming
        statsData = JSON.parse(statsResponse.data.trim());
      } else {
        statsData = statsResponse.data;
      }
      
      res.json({
        activeGameUsers: statsData.activeGameUsers || 0,
        totalClaims: statsData.totalClaims || 0,
        totalTokensDistributed: statsData.totalTokensDistributed || 0,
        averageBalance: parseFloat(statsData.averageBalance) || 0,
        topUserBalance: statsData.topUserBalance || 0,
        lastUpdated: statsData.last_updated,
        _source: 'DirectSponsor OAuth backup endpoint'
      });
    } catch (statsError) {
      console.error('DirectSponsor stats API failed:', statsError.message);
      
      // Final fallback
      res.json({
        activeGameUsers: 0,
        totalClaims: 0,
        totalTokensDistributed: 0,
        averageBalance: 0,
        error: 'Stats temporarily unavailable',
        _source: 'Fallback data'
      });
    }
  }
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

// OAuth configuration moved to top of file

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

