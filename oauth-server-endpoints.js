// ROFLFaucet OAuth Server Endpoints
// Add these to your existing Express server (src/index.js)

const axios = require('axios');

// OAuth configuration
const OAUTH_CONFIG = {
    clientId: 'roflfaucet',
    clientSecret: 'roflfaucet-client-secret-change-this', // Must match DirectSponsor config
    directSponsorBaseUrl: 'https://auth.directsponsor.org',
    redirectUri: process.env.SITE_URL + '/auth/callback' // e.g., https://roflfaucet.com/auth/callback
};

// Token exchange endpoint
app.post('/api/oauth/token', async (req, res) => {
    const { code, redirect_uri } = req.body;
    
    if (!code || !redirect_uri) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    try {
        // Exchange authorization code for access token with DirectSponsor
        const tokenResponse = await axios.post(`${OAUTH_CONFIG.directSponsorBaseUrl}/oauth/token`, {
            grant_type: 'authorization_code',
            client_id: OAUTH_CONFIG.clientId,
            client_secret: OAUTH_CONFIG.clientSecret,
            code: code,
            redirect_uri: redirect_uri
        }, {
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
        console.error('OAuth token exchange failed:', error.response?.data || error.message);
        
        if (error.response?.data) {
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
        
        // Return user data (adapt field names if needed)
        res.json({
            id: userData.id,
            username: userData.username,
            email: userData.email,
            display_name: userData.display_name,
            useless_coin_balance: userData.useless_coin_balance || 0
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

// OAuth callback route (serves the callback page)
app.get('/auth/callback', (req, res) => {
    // Serve your main HTML page - the OAuth client will handle the callback
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Update coins via DirectSponsor API
async function updateUserCoins(userId, newBalance) {
    // Get user's access token (you'll need to store this when they authenticate)
    const userSession = getUserSession(userId); // Implement this function
    
    if (!userSession || !userSession.access_token) {
        console.error('No access token for user:', userId);
        return false;
    }
    
    try {
        const response = await axios.post(`${OAUTH_CONFIG.directSponsorBaseUrl}/api/user/coins`, {
            balance: newBalance
        }, {
            headers: {
                'Authorization': `Bearer ${userSession.access_token}`
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Failed to update user coins:', error.response?.data || error.message);
        return false;
    }
}

// Helper function to store/retrieve user sessions
// You'll need to implement this based on your storage method
function getUserSession(userId) {
    // This should return stored session data including access_token
    // Could be in-memory, database, or Redis
    return null; // Placeholder
}

module.exports = {
    OAUTH_CONFIG,
    updateUserCoins
};

