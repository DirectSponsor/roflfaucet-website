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
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.hcaptcha.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://youtube.com", "https://hcaptcha.com", "https://*.hcaptcha.com", "https://imgur.com", "https://*.imgur.com"],
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

// Serve static files (index.html, script.js, etc.)
app.use(express.static(path.join(__dirname, '..')));

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

// Create new user session
app.post('/api/user/create', (req, res) => {
  const { username } = req.body;
  
  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  const userId = generateUserId();
  const user = {
    id: userId,
    username: username.trim(),
    balance: 0,
    totalClaims: 0,
    created: Date.now()
  };
  
  users.set(userId, user);
  
  res.json({
    userId: user.id,
    username: user.username,
    balance: user.balance,
    totalClaims: user.totalClaims,
    canClaim: true
  });
});

// Claim tokens
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
  
  const user = users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  if (!canClaim(userId)) {
    const nextClaim = getNextClaimTime(userId);
    return res.status(429).json({ 
      error: 'Claim cooldown active',
      nextClaimAvailable: nextClaim,
      message: `You can claim again at ${nextClaim.toLocaleTimeString()}`
    });
  }
  
  // Award tokens (random amount between 25-75)
  const tokensAwarded = Math.floor(Math.random() * 51) + 25;
  
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

// Serve the main page for all other routes
app.get('*', (req, res) => {
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

