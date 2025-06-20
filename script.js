// ROFLFaucet - Frontend Only with Centralized OAuth - DEBUG VERSION v1.1
// Pure frontend solution that talks to auth.directsponsor.org
console.log('🎲 ROFLFaucet Centralized Auth loading... DEBUG VERSION v1.1');

// Immediate debug indicator - COMMENTED OUT FOR PRODUCTION
// setTimeout(() => {
//     const indicator = document.createElement('div');
//     indicator.innerHTML = '🔧 DEBUG v1.1 LOADED';
//     indicator.style.cssText = `
//         position: fixed; top: 5px; left: 5px; background: lime; color: black;
//         padding: 5px; font-weight: bold; z-index: 99999; border: 2px solid black;
//     `;
//     document.body.appendChild(indicator);
// }, 1000);

class ROFLFaucetCentralized {
    constructor() {
        // Auth server configuration - back to production with direct paths
        this.authApiBase = 'https://auth.directsponsor.org';
        this.userDataApiBase = 'https://data.directsponsor.org/api';
        this.clientId = 'roflfaucet';
        this.redirectUri = window.location.origin + '/auth/callback.html';
        
        // User state
        this.accessToken = null;
        this.userProfile = null;
        this.dashboardData = null;
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
        
        // Captcha callbacks - robust with fallback
        const self = this;
        
        window.hcaptchaCallback = function(token) {
            console.log('✅ hCaptcha solved - token received:', token);
            self.captchaToken = token;
            console.log('🔍 Updating UI after captcha success...');
            console.log('🔍 Current user stats:', self.userStats);
            self.updateUI(); // Force full UI update
        };
        
        window.hcaptchaExpired = function() {
            console.log('⏰ hCaptcha expired');
            self.captchaToken = null;
            self.updateUI(); // Force full UI update
        };
        
        // Enable fallback captcha test button after 3 seconds if hCaptcha has issues
        setTimeout(() => {
            if (!self.captchaToken) {
                console.log('🧪 Enabling captcha fallback test mode...');
                const fallbackDiv = document.getElementById('captcha-fallback');
                const testBtn = document.getElementById('simulate-captcha-btn');
                
                if (fallbackDiv) fallbackDiv.style.display = 'block';
                if (testBtn) {
                    testBtn.addEventListener('click', () => {
                        console.log('🧪 Test captcha button clicked');
                        const testToken = 'test_token_' + Date.now();
                        self.captchaToken = testToken;
                        console.log('✅ Simulated captcha success with token:', testToken);
                        self.updateUI();
                    });
                }
            }
        }, 3000);
    }
    
    // Debug functions - COMMENTED OUT FOR PRODUCTION
    // addDebugInfo() {
    //     const debugDiv = document.getElementById('debug-info') || this.createDebugDiv();
    //     const urlParams = new URLSearchParams(window.location.search);
    //     const storedToken = localStorage.getItem('roflfaucet_access_token');
    //     const storedRefresh = localStorage.getItem('roflfaucet_refresh_token');
    //     const oauthState = localStorage.getItem('oauth_state');
    //     
    //     debugDiv.innerHTML = `
    //         <h4>🔧 Debug Info</h4>
    //         <p><strong>URL Code:</strong> ${urlParams.get('code') ? urlParams.get('code').substring(0, 8) + '...' : 'None'}</p>
    //         <p><strong>Access Token:</strong> ${storedToken ? storedToken.substring(0, 8) + '...' : 'None'}</p>
    //         <p><strong>Refresh Token:</strong> ${storedRefresh ? storedRefresh.substring(0, 8) + '...' : 'None'}</p>
    //         <p><strong>OAuth State:</strong> ${oauthState || 'None'}</p>
    //         <p><strong>User Profile:</strong> ${this.userProfile ? this.userProfile.username : 'Not loaded'}</p>
    //     `;
    // }
    // 
    // createDebugDiv() {
    //     const debugDiv = document.createElement('div');
    //     debugDiv.id = 'debug-info';
    //     debugDiv.style.cssText = `
    //         position: fixed;
    //         top: 10px;
    //         right: 10px;
    //         background: #ff0000;
    //         color: white;
    //         padding: 15px;
    //         border-radius: 8px;
    //         font-size: 14px;
    //         max-width: 350px;
    //         z-index: 99999;
    //         border: 3px solid yellow;
    //         box-shadow: 0 4px 8px rgba(0,0,0,0.5);
    //     `;
    //     document.body.appendChild(debugDiv);
    //     return debugDiv;
    // }
    // 
    // showDebugMessage(message) {
    //     const debugDiv = document.getElementById('debug-info');
    //     if (debugDiv) {
    //         const msgP = document.createElement('p');
    //         msgP.innerHTML = `<strong style="color: yellow;">${new Date().toLocaleTimeString()}:</strong> ${message}`;
    //         debugDiv.appendChild(msgP);
    //     }
    // }
    
    // OAuth Authentication Flow
    
    checkAuthState() {
        console.log('🔍 Checking authentication state...');
        
        // Add debug info to page - COMMENTED OUT FOR PRODUCTION
        // this.addDebugInfo();
        
        // Check if we're on the callback page
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        
        if (authCode) {
            console.log('📨 Auth code received, exchanging for token...');
            // this.showDebugMessage(`Auth code received: ${authCode.substring(0, 8)}...`);
            this.exchangeCodeForToken(authCode);
            return;
        }
        
        // Check for existing session
        this.accessToken = localStorage.getItem('roflfaucet_access_token');
        if (this.accessToken) {
            console.log('🔑 Found existing access token');
            // this.showDebugMessage(`Found stored token: ${this.accessToken.substring(0, 8)}...`);
            this.loadUserProfile();
        } else {
            console.log('❌ No authentication found, showing welcome');
            // this.showDebugMessage('No stored authentication found');
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
            // this.showDebugMessage('Starting token exchange...');
            
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
            
            // this.showDebugMessage(`Token response: ${response.status}`);
            
            if (response.ok) {
                const tokenData = await response.json();
                
                this.accessToken = tokenData.access_token;
                localStorage.setItem('roflfaucet_access_token', this.accessToken);
                
                if (tokenData.refresh_token) {
                    localStorage.setItem('roflfaucet_refresh_token', tokenData.refresh_token);
                }
                
                console.log('✅ Token exchange successful');
                // this.showDebugMessage('✅ Token exchange successful!');
                
                // Clean up URL and load user profile
                window.history.replaceState({}, document.title, window.location.pathname);
                await this.loadUserProfile();
                
            } else {
                const errorText = await response.text();
                console.error('❌ Token exchange failed:', response.status, errorText);
                // this.showDebugMessage(`❌ Token failed: ${response.status} - ${errorText}`);
                this.showMessage('Authentication failed. Please try again.', 'error');
                this.showWelcomeInterface();
            }
            
        } catch (error) {
            console.error('💥 Token exchange error:', error);
            // this.showDebugMessage(`💥 Exchange error: ${error.message}`);
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
                
                // OAuth successful! Load real user dashboard data
                await this.loadUserDashboard();
                this.showUserInterface();
                this.showMessage(`Welcome back, ${this.userProfile.username}! Loading your data...`, 'success');
                
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
    
    // User Dashboard Integration
    
    async loadUserDashboard() {
        if (!this.accessToken) {
            console.log('❌ No access token for dashboard');
            return;
        }
        
        try {
            console.log('📊 Loading user dashboard data...');
            
            const response = await fetch(`${this.userDataApiBase}/dashboard?site_id=roflfaucet`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            if (response.ok) {
                this.dashboardData = await response.json();
                console.log('✅ Dashboard data loaded:', this.dashboardData);
                
                // Update user stats with real data
                this.userStats = {
                    balance: parseFloat(this.dashboardData.dashboard.balance.useless_coins),
                    coinBalance: parseFloat(this.dashboardData.dashboard.balance.useless_coins),
                    totalClaims: parseInt(this.dashboardData.dashboard.user_profile.total_claims),
                    canClaim: this.dashboardData.dashboard.claim_statuses.roflfaucet.can_claim,
                    nextClaimTime: this.dashboardData.dashboard.claim_statuses.roflfaucet.next_claim
                };
                
                this.showMessage(`Welcome back! You have ${this.userStats.balance} UselessCoins`, 'success');
                this.updateUI();
                
            } else if (response.status === 401) {
                console.log('🔄 Dashboard auth failed, refreshing token...');
                await this.refreshAccessToken();
            } else {
                console.error('❌ Failed to load dashboard:', response.status);
                // Fall back to mock data
                this.loadMockUserData();
            }
            
        } catch (error) {
            console.error('💥 Dashboard loading error:', error);
            this.showMessage('Using local mode - dashboard unavailable', 'warning');
            // Fall back to mock data
            this.loadMockUserData();
        }
    }
    
    async processFaucetClaim() {
        if (!this.accessToken) {
            this.showMessage('Please log in first', 'error');
            return;
        }
        
        // Captcha removed for testing - can be re-added later
        
        try {
            console.log('🎲 Processing faucet claim...');
            this.showMessage('Processing your claim...', 'info');
            
            const response = await fetch(`${this.userDataApiBase}/balance/claim`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    site_id: 'roflfaucet',
                    captcha_token: this.captchaToken
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                console.log('✅ Claim successful!', result);
                
                // Reset captcha
                this.captchaToken = null;
                if (window.hcaptcha) {
                    window.hcaptcha.reset();
                }
                
                // Show success message
                const coinsEarned = result.rewards.useless_coins;
                this.showMessage(`🎉 Claim successful! You earned ${coinsEarned} UselessCoins!`, 'success');
                
                // Reload dashboard to get updated balance
                await this.loadUserDashboard();
                
            } else {
                console.error('❌ Claim failed:', result);
                this.showMessage(result.error || 'Claim failed. Please try again.', 'error');
                
                // Reset captcha on error
                this.captchaToken = null;
                if (window.hcaptcha) {
                    window.hcaptcha.reset();
                }
            }
            
        } catch (error) {
            console.error('💥 Claim processing error:', error);
            this.showMessage('Network error during claim. Please try again.', 'error');
            
            // Reset captcha on error
            this.captchaToken = null;
            if (window.hcaptcha) {
                window.hcaptcha.reset();
            }
        }
    }
    
    canUserClaim(lastClaimAt) {
        if (!lastClaimAt) return true;
        
        const lastClaim = new Date(lastClaimAt);
        const now = new Date();
        const timeDiff = now - lastClaim;
        const cooldownTime = 60 * 1000; // 60 seconds (debug mode)
        
        return timeDiff >= cooldownTime;
    }
    
    getNextClaimTime(lastClaimAt) {
        if (!lastClaimAt) return null;
        
        const lastClaim = new Date(lastClaimAt);
        const cooldownTime = 60 * 1000; // 60 seconds (debug mode)
        return new Date(lastClaim.getTime() + cooldownTime);
    }
    
    // Claim Token Logic
    
    async handleClaim() {
        console.log('🎲 Handle claim called');
        
        if (!this.userStats.canClaim) {
            const nextClaim = new Date(this.userStats.nextClaimTime);
            const timeLeft = Math.ceil((nextClaim - new Date()) / 1000 / 60);
            this.showMessage(`You can claim again in ${timeLeft} minutes`, 'warning');
            return;
        }
        
        // Process the real faucet claim
        await this.processFaucetClaim();
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
        const userSection = document.getElementById('user-interface');
        const captchaSection = document.getElementById('captcha-section');
        
        if (welcomeSection) welcomeSection.style.display = 'none';
        if (userSection) userSection.style.display = 'block';
        
        // Hide captcha section for simplified testing
        if (captchaSection) {
            captchaSection.style.display = 'none';
            console.log('😫 Captcha section hidden (simplified testing mode)');
        }
        
        // Load mock user data for demonstration
        this.loadMockUserData();
        this.updateUI();
        
        console.log('👤 Showing user interface');
    }
    
    loadMockUserData() {
        // Load or generate mock user data for testing (fallback only)
        const savedBalance = localStorage.getItem('roflfaucet_mock_balance');
        const savedClaims = localStorage.getItem('roflfaucet_mock_claims');
        
        this.userStats = {
            balance: savedBalance ? parseFloat(savedBalance) : 0.0,
            coinBalance: savedBalance ? parseFloat(savedBalance) : 0.0,
            totalClaims: savedClaims ? parseInt(savedClaims) : 0,
            canClaim: true,  // FORCED TRUE FOR TESTING
            nextClaimTime: null
        };
        
        console.log('📊 Mock user data loaded (fallback mode):', this.userStats);
        console.log('🧪 DEBUG: canClaim explicitly set to:', this.userStats.canClaim);
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
        
        // Update claim button (simplified - no captcha required)
        const claimBtn = document.getElementById('claim-btn');
        if (claimBtn) {
            const canClaimNow = this.userStats.canClaim;
            
            console.log('🔍 Claim button update:');
            console.log('   - canClaim:', this.userStats.canClaim);
            console.log('   - canClaimNow:', canClaimNow);
            
            console.log('🧪 BUTTON STATE BEFORE:');
            console.log('   - button.disabled (before):', claimBtn.disabled);
            console.log('   - userStats.canClaim:', this.userStats.canClaim);
            console.log('   - canClaimNow:', canClaimNow);
            
            // NOW set the disabled property
            claimBtn.disabled = !canClaimNow;
            
            console.log('🧪 BUTTON STATE AFTER:');
            console.log('   - button.disabled (after):', claimBtn.disabled);
            console.log('   - button element:', claimBtn ? 'found' : 'missing');
            
            const btnText = claimBtn.querySelector('.btn-text');
            if (btnText) {
                if (!this.userStats.canClaim) {
                    btnText.textContent = 'Cooldown Active';
                } else {
                    btnText.textContent = '🎲 Claim 5 UselessCoins!';
                }
                console.log('🎯 Button text set to:', btnText.textContent);
            } else {
                console.log('⚠️ btn-text element not found!');
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
            // User stats updates will be handled by data.directsponsor.org later
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

