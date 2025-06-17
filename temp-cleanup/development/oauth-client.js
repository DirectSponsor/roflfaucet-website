// ROFLFaucet OAuth Client - "Sign in with DirectSponsor"

class DirectSponsorAuth {
    constructor() {
        this.clientId = 'roflfaucet';
        // Use production URL for redirect, fallback to current origin for development
        this.redirectUri = window.location.hostname === 'localhost' ? 
            window.location.origin + '/auth/callback' : 
            'https://roflfaucet.com/auth/callback';
        this.authBaseUrl = 'https://auth.directsponsor.org';
        this.scopes = 'profile coins';
        
        // Initialize OAuth client
        this.init();
    }
    
    async init() {
        // Check if we're on the callback page
        if (window.location.pathname === '/auth/callback') {
            this.handleCallback();
            return;
        }
        
        // Set up login button
        await this.setupLoginButton();
    }
    
    // Generate random state for CSRF protection
    generateState() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    
    // Initiate OAuth login flow
    login() {
        const state = this.generateState();
        localStorage.setItem('oauth_state', state);
        
        const authUrl = `${this.authBaseUrl}/oauth/authorize.php?` +
            `client_id=${encodeURIComponent(this.clientId)}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
            `scope=${encodeURIComponent(this.scopes)}&` +
            `state=${encodeURIComponent(state)}`;
        
        console.log('🔐 Redirecting to DirectSponsor for authentication...');
        window.location.href = authUrl;
    }
    
    // Handle OAuth callback
    async handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        // Check for errors
        if (error) {
            console.error('OAuth error:', error);
            this.showMessage('Authentication failed: ' + error, 'error');
            this.redirectToMain();
            return;
        }
        
        // Verify state (CSRF protection)
        const savedState = localStorage.getItem('oauth_state');
        if (!state || state !== savedState) {
            console.error('Invalid state parameter');
            this.showMessage('Authentication failed: Security check failed', 'error');
            this.redirectToMain();
            return;
        }
        
        if (code) {
            try {
                // Exchange authorization code for access token
                await this.exchangeCodeForToken(code);
            } catch (error) {
                console.error('Token exchange failed:', error);
                this.showMessage('Authentication failed: ' + error.message, 'error');
                this.redirectToMain();
            }
        } else {
            this.showMessage('Authentication failed: No authorization code received', 'error');
            this.redirectToMain();
        }
    }
    
    // Exchange authorization code for access token
    async exchangeCodeForToken(code) {
        const response = await fetch('/api/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: code,
                redirect_uri: this.redirectUri
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store tokens securely
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            localStorage.setItem('token_expires', Date.now() + (data.expires_in * 1000));
            
            // Get user profile
            await this.loadUserProfile();
            
            this.showMessage('Successfully signed in with DirectSponsor!', 'success');
            this.redirectToMain();
        } else {
            throw new Error(data.error || 'Token exchange failed');
        }
    }
    
    // Load user profile from DirectSponsor
    async loadUserProfile() {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) return null;
        
        try {
            const response = await fetch('/api/oauth/userinfo', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (response.ok) {
                const userProfile = await response.json();
                
                // Store user info
                localStorage.setItem('user_profile', JSON.stringify(userProfile));
                localStorage.setItem('roflfaucet_userId', userProfile.id);
                localStorage.setItem('roflfaucet_username', userProfile.username);
                
                return userProfile;
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
        
        return null;
    }
    
    // Check if user is authenticated  
    // The truth is baked into every function call - code cannot lie about reality
    async isAuthenticated() {
        let accessToken = localStorage.getItem('access_token');
        const tokenExpires = localStorage.getItem('token_expires');
        
        if (!accessToken || !tokenExpires) return false;
        
        // Check if token is expired
        if (Date.now() >= parseInt(tokenExpires)) {
            console.log('Access token expired, attempting refresh...');
            try {
                await this.refreshAccessToken();
                accessToken = localStorage.getItem('access_token');
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                this.logout();
                return false;
            }
        }
        return true;
    }
    
    // Get current user profile
    getCurrentUser() {
        const userProfile = localStorage.getItem('user_profile');
        return userProfile ? JSON.parse(userProfile) : null;
    }
    
    // Refresh access token using refresh token
    async refreshAccessToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }
        
        try {
            const response = await fetch(`${this.apiBase}/api/oauth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: refreshToken
                })
            });
            
            if (response.ok) {
                const tokenData = await response.json();
                
                // Update stored tokens
                localStorage.setItem('access_token', tokenData.access_token);
                if (tokenData.refresh_token) {
                    localStorage.setItem('refresh_token', tokenData.refresh_token);
                }
                localStorage.setItem('token_expires', Date.now() + (tokenData.expires_in * 1000));
                
                console.log('Access token refreshed successfully');
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            // Clear tokens if refresh fails
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('token_expires');
            throw error;
        }
    }
    
    // Logout user
    logout() {
        // Clear all authentication data
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expires');
        localStorage.removeItem('user_profile');
        localStorage.removeItem('roflfaucet_userId');
        localStorage.removeItem('roflfaucet_username');
        localStorage.removeItem('oauth_state');
        
        console.log('User logged out');
        
        // Refresh page to show login interface
        window.location.reload();
    }
    
    // Set up login button
    async setupLoginButton() {
        // Check authentication status first
        const isAuth = await this.isAuthenticated();
        
        // Update existing signup button to OAuth login
        const signupBtn = document.getElementById('signup-btn');
        if (signupBtn && !isAuth) {
            signupBtn.textContent = '🔐 Sign in with DirectSponsor';
            signupBtn.onclick = () => this.login();
        }
        
        // Add logout functionality if user is authenticated
        if (isAuth) {
            this.setupLogoutButton();
        }
    }
    
    // Set up logout button
    setupLogoutButton() {
        const user = this.getCurrentUser();
        if (user) {
            // Update UI to show logged in state
            const signupSection = document.getElementById('signup-section');
            if (signupSection) {
                signupSection.innerHTML = `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <p>Signed in as <strong>${user.username}</strong></p>
                        <p><small>via DirectSponsor</small></p>
                        <button id="logout-btn" class="btn btn-secondary" style="
                            padding: 10px 20px;
                            background: #f8f9fa;
                            border: 2px solid #dee2e6;
                            border-radius: 8px;
                            cursor: pointer;
                        ">🚪 Sign Out</button>
                    </div>
                `;
                
                // Add logout functionality
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.onclick = () => this.logout();
                }
            }
        }
    }
    
    // Show message to user
    showMessage(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Try to use existing message display
        if (window.roflfaucet && window.roflfaucet.showMessage) {
            window.roflfaucet.showMessage(message, type);
        } else {
            // Fallback to alert
            alert(message);
        }
    }
    
    // Redirect to main page
    redirectToMain() {
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }
}

// Initialize DirectSponsor OAuth when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔐 Initializing DirectSponsor OAuth client...');
    window.directSponsorAuth = new DirectSponsorAuth();
});

// Global function for login button
window.loginWithDirectSponsor = function() {
    if (window.directSponsorAuth) {
        window.directSponsorAuth.login();
    }
};

