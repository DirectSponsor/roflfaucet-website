// ROFLFaucet - Frontend Only with Centralized OAuth
// Pure frontend solution that talks to auth.directsponsor.org
console.log('🎲 ROFLFaucet Centralized Auth loading...');

class ROFLFaucetCentralized {
    constructor() {
        // Auth server configuration - back to production with direct paths
        this.authApiBase = 'https://auth.directsponsor.org';
        this.clientId = 'roflfaucet';
        this.redirectUri = window.location.origin + '/auth/callback.html';
        
        // User state
        this.accessToken = null;
        this.userProfile = null;
        this.userStats = {
            balance: 0,
            coinBalance: 0,
            totalClaims: 0,
            canClaim: true,
            nextClaimTime: null
        };
        this.captchaToken = null;
        
        console.log('🔧 ROFLFaucet Centralized initialized');
        this.init();
    }

    init() {
        console.log('🚀 Initializing centralized auth version...');
        this.setupEventListeners();
        this.checkAuthState();
        this.loadGlobalStats();
        this.startPeriodicUpdates();
    }

    setupEventListeners() {
        console.log('📡 Setting up event listeners...');
        
        // Start claiming button (triggers OAuth login)
        const startClaimBtn = document.getElementById('start-claiming-btn');
        if (startClaimBtn) {
            startClaimBtn.addEventListener('click', () => this.startOAuthLogin());
        }
        
        // Claim button
        const claimBtn = document.getElementById('claim-btn');
        if (claimBtn) {
            claimBtn.addEventListener('click', (event) => {
                console.log('🎲 Claim button clicked!');
                event.preventDefault();
                this.handleClaim();
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // Captcha callbacks
        window.hcaptchaCallback = (token) => {
            console.log('✅ hCaptcha solved');
            this.captchaToken = token;
            this.updateCaptchaSubmitButton();
        };
        
        window.hcaptchaExpired = () => {
            console.log('⏰ hCaptcha expired');
            this.captchaToken = null;
            this.updateCaptchaSubmitButton();
        };
    }

    // OAuth Authentication Flow
    
    checkAuthState() {
        console.log('🔍 Checking authentication state...');
        
        // Check if we're on the callback page
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        
        if (authCode) {
            console.log('📨 Auth code received, exchanging for token...');
            this.exchangeCodeForToken(authCode);
            return;
        }
        
        // Check for existing session
        this.accessToken = localStorage.getItem('roflfaucet_access_token');
        if (this.accessToken) {
            console.log('🔑 Found existing access token');
            this.loadUserProfile();
        } else {
            console.log('❌ No authentication found, showing welcome');
            this.showWelcomeInterface();
        }
    }
    
    startOAuthLogin() {
        console.log('🔐 Starting OAuth login flow...');
        
        // Generate state parameter for security
        const state = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('oauth_state', state);
        
        // Redirect to auth server using direct path to bypass rewrite issues
        const authUrl = new URL(`${this.authApiBase}/authorize.php`);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('scope', 'read write');
        authUrl.searchParams.append('state', state);
        
        console.log('🌐 Redirecting to:', authUrl.toString());
        window.location.href = authUrl.toString();
    }
    
    async exchangeCodeForToken(code) {
        try {
            console.log('🔄 Exchanging authorization code for access token...');
            
            const response = await fetch(`${this.authApiBase}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: this.clientId,
                    code: code,
                    redirect_uri: this.redirectUri
                })
            });
            
            if (response.ok) {
                const tokenData = await response.json();
                
                this.accessToken = tokenData.access_token;
                localStorage.setItem('roflfaucet_access_token', this.accessToken);
                
                if (tokenData.refresh_token) {
                    localStorage.setItem('roflfaucet_refresh_token', tokenData.refresh_token);
                }
                
                console.log('✅ Token exchange successful');
                
                // Clean up URL and load user profile
                window.history.replaceState({}, document.title, window.location.pathname);
                await this.loadUserProfile();
                
            } else {
                console.error('❌ Token exchange failed:', response.status);
                this.showMessage('Authentication failed. Please try again.', 'error');
                this.showWelcomeInterface();
            }
            
        } catch (error) {
            console.error('💥 Token exchange error:', error);
            this.showMessage('Connection error during login. Please try again.', 'error');
            this.showWelcomeInterface();
        }
    }
    
    async loadUserProfile() {
        if (!this.accessToken) {
            console.log('❌ No access token available');
            return;
        }
        
        try {
            console.log('👤 Loading user profile from centralized API...');
            
            const response = await fetch(`${this.authApiBase}/oauth/userinfo`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            if (response.ok) {
                this.userProfile = await response.json();
                console.log('✅ User profile loaded:', this.userProfile.username);
                
                // OAuth test successful! Show user interface without user data
                this.showUserInterface();
                this.showMessage(`Welcome back, ${this.userProfile.username}! OAuth login successful.`, 'success');
                
            } else if (response.status === 401) {
                console.log('🔄 Access token expired, attempting refresh...');
                await this.refreshAccessToken();
            } else {
                console.error('❌ Failed to load user profile:', response.status);
                this.handleLogout();
            }
            
        } catch (error) {
            console.error('💥 Profile loading error:', error);
            this.showMessage('Failed to load profile. Please try logging in again.', 'error');
            this.handleLogout();
        }
    }
    
    async refreshAccessToken() {
        const refreshToken = localStorage.getItem('roflfaucet_refresh_token');
        if (!refreshToken) {
            console.log('❌ No refresh token available');
            this.handleLogout();
            return;
        }
        
        try {
            console.log('🔄 Refreshing access token...');
            
            const response = await fetch(`${this.authApiBase}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: this.clientId,
                    refresh_token: refreshToken
                })
            });
            
            if (response.ok) {
                const tokenData = await response.json();
                
                this.accessToken = tokenData.access_token;
                localStorage.setItem('roflfaucet_access_token', this.accessToken);
                
                if (tokenData.refresh_token) {
                    localStorage.setItem('roflfaucet_refresh_token', tokenData.refresh_token);
                }
                
                console.log('✅ Token refreshed successfully');
                await this.loadUserProfile();
                
            } else {
                console.log('❌ Token refresh failed');
                this.handleLogout();
            }
            
        } catch (error) {
            console.error('💥 Token refresh error:', error);
            this.handleLogout();
        }
    }
    
    // User stats removed - will be handled by users.directsponsor.org later
    
    canUserClaim(lastClaimAt) {
        if (!lastClaimAt) return true;
        
        const lastClaim = new Date(lastClaimAt);
        const now = new Date();
        const timeDiff = now - lastClaim;
        const cooldownTime = 60 * 60 * 1000; // 1 hour
        
        return timeDiff >= cooldownTime;
    }
    
    getNextClaimTime(lastClaimAt) {
        if (!lastClaimAt) return null;
        
        const lastClaim = new Date(lastClaimAt);
        const cooldownTime = 60 * 60 * 1000; // 1 hour
        return new Date(lastClaim.getTime() + cooldownTime);
    }
    
    // Claim Token Logic
    
    async handleClaim() {
        // Claims disabled for OAuth testing - will be handled by users.directsponsor.org later
        this.showMessage('OAuth test mode: Claims will be implemented with user data system', 'info');
        console.log('🧪 Claims disabled - OAuth testing mode');
    }
    
    // UI Management
    
    showWelcomeInterface() {
        const welcomeSection = document.getElementById('welcome-section');
        const userSection = document.getElementById('user-section');
        
        if (welcomeSection) welcomeSection.style.display = 'block';
        if (userSection) userSection.style.display = 'none';
        
        console.log('👋 Showing welcome interface');
    }
    
    showUserInterface() {
        const welcomeSection = document.getElementById('welcome-section');
        const userSection = document.getElementById('user-section');
        
        if (welcomeSection) welcomeSection.style.display = 'none';
        if (userSection) userSection.style.display = 'block';
        
        console.log('👤 Showing user interface');
    }
    
    updateUI() {
        // Update balance displays
        const balanceDisplay = document.getElementById('token-balance');
        if (balanceDisplay) {
            balanceDisplay.textContent = this.userStats.balance.toFixed(2);
        }
        
        const coinDisplay = document.getElementById('coin-balance');
        if (coinDisplay) {
            coinDisplay.textContent = this.userStats.coinBalance.toFixed(2);
        }
        
        const claimsDisplay = document.getElementById('claims-display');
        if (claimsDisplay) {
            claimsDisplay.textContent = this.userStats.totalClaims;
        }
        
        // Update username
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay && this.userProfile) {
            usernameDisplay.textContent = this.userProfile.username;
        }
        
        // Update claim button
        const claimBtn = document.getElementById('claim-btn');
        if (claimBtn) {
            claimBtn.disabled = !this.userStats.canClaim;
            const btnText = claimBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = this.userStats.canClaim ? 
                    '🎲 Claim 5 WorthlessTokens!' : 
                    'Cooldown Active';
            }
        }
        
        this.updateCaptchaSubmitButton();
    }
    
    updateCaptchaSubmitButton() {
        const claimBtn = document.getElementById('claim-btn');
        if (claimBtn) {
            const hasValidCaptcha = !!this.captchaToken;
            const canClaimNow = this.userStats.canClaim && hasValidCaptcha;
            claimBtn.disabled = !canClaimNow;
        }
    }
    
    startCountdown() {
        if (!this.userStats.nextClaimTime) return;
        
        const updateCountdown = () => {
            const now = new Date();
            const timeLeft = this.userStats.nextClaimTime - now;
            
            if (timeLeft <= 0) {
                this.userStats.canClaim = true;
                this.updateUI();
                const countdownDisplay = document.getElementById('countdown-display');
                if (countdownDisplay) {
                    countdownDisplay.textContent = '00:00';
                }
                return;
            }
            
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            
            const countdownDisplay = document.getElementById('countdown-display');
            if (countdownDisplay) {
                countdownDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            setTimeout(updateCountdown, 1000);
        };
        
        updateCountdown();
    }
    
    showMessage(message, type = 'info') {
        console.log(`📢 Message (${type}): ${message}`);
        
        const messageDiv = document.getElementById('message-display');
        if (!messageDiv) {
            // Fallback to alert if no message div
            alert(`${type.toUpperCase()}: ${message}`);
            return;
        }
        
        messageDiv.textContent = message;
        messageDiv.className = `message-display ${type}`;
        messageDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
    
    handleLogout() {
        console.log('🚪 Logging out...');
        
        // Clear local storage
        localStorage.removeItem('roflfaucet_access_token');
        localStorage.removeItem('roflfaucet_refresh_token');
        localStorage.removeItem('oauth_state');
        
        // Reset state
        this.accessToken = null;
        this.userProfile = null;
        this.userStats = {
            balance: 0,
            coinBalance: 0,
            totalClaims: 0,
            canClaim: true,
            nextClaimTime: null
        };
        
        this.showWelcomeInterface();
        this.showMessage('You have been logged out', 'info');
    }
    
    // Global Stats (mock for now)
    async loadGlobalStats() {
        // Mock global stats - could be replaced with real API call
        const globalStats = {
            totalUsers: Math.floor(Math.random() * 1000) + 500,
            totalClaims: Math.floor(Math.random() * 10000) + 5000,
            charityFunding: Math.floor(Math.random() * 500) + 100
        };
        
        // Update global stats display if elements exist
        const totalUsersEl = document.getElementById('global-users');
        if (totalUsersEl) totalUsersEl.textContent = globalStats.totalUsers;
        
        const totalClaimsEl = document.getElementById('global-claims');
        if (totalClaimsEl) totalClaimsEl.textContent = globalStats.totalClaims;
        
        const charityFundingEl = document.getElementById('charity-funding');
        if (charityFundingEl) charityFundingEl.textContent = `$${globalStats.charityFunding}`;
    }
    
    startPeriodicUpdates() {
        // Update global stats every 30 seconds
        setInterval(() => {
            this.loadGlobalStats();
            // User stats updates will be handled by users.directsponsor.org later
        }, 30000);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM loaded, initializing ROFLFaucet...');
    
    try {
        window.roflfaucet = new ROFLFaucetCentralized();
        console.log('✅ ROFLFaucet initialized successfully!');
    } catch (error) {
        console.error('💥 Failed to initialize ROFLFaucet:', error);
    }
});

// Global hCaptcha callback functions
window.onCaptchaSuccess = function(token) {
    console.log('✅ hCaptcha solved globally');
    if (window.roflfaucet) {
        window.roflfaucet.captchaToken = token;
        window.roflfaucet.updateCaptchaSubmitButton();
    }
};

window.onCaptchaError = function(error) {
    console.error('❌ hCaptcha error:', error);
    if (window.roflfaucet) {
        window.roflfaucet.showMessage('Security check failed. Please try again.', 'error');
        window.roflfaucet.captchaToken = null;
        window.roflfaucet.updateCaptchaSubmitButton();
    }
};

// Simulate captcha for development
window.simulateCaptchaSuccess = function() {
    console.log('🧪 Simulating captcha success for testing');
    const fakeToken = 'test_token_' + Math.random().toString(36).substr(2, 9);
    if (window.roflfaucet) {
        window.roflfaucet.captchaToken = fakeToken;
        window.roflfaucet.updateCaptchaSubmitButton();
    }
};

