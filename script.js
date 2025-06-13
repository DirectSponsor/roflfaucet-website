// ROFLFaucet JavaScript - Working Version
console.log('ROFLFaucet script loading...');

class ROFLFaucet {
    constructor() {
        this.apiBase = window.location.origin;
        this.userId = null;
        this.username = null;
        this.userStats = {
            balance: 0,
            totalClaims: 0,
            canClaim: true,
            nextClaimTime: null
        };
        this.captchaToken = null;
        
        console.log('ROFLFaucet initialized');
        this.init();
    }

    init() {
        console.log('Initializing...');
        this.setupEventListeners();
        this.checkUserSession();
        this.loadGlobalStats();
        this.startPeriodicUpdates();
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Signup button
        const signupBtn = document.getElementById('signup-btn');
        if (signupBtn) {
            signupBtn.addEventListener('click', () => this.handleSignup());
            console.log('Signup button found and connected');
        }
        
        // Username input enter key
        const usernameInput = document.getElementById('username-input');
        if (usernameInput) {
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSignup();
            });
        }
        
        // Claim button
        const claimBtn = document.getElementById('claim-btn');
        if (claimBtn) {
            claimBtn.addEventListener('click', (event) => {
                console.log('🎲 Claim button clicked!');
                event.preventDefault();
                this.handleClaim();
            });
            console.log('Claim button found and connected');
        } else {
            console.warn('❌ Claim button not found during setup');
        }
        
        // Refresh stats button
        const refreshBtn = document.getElementById('refresh-stats');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadGlobalStats());
        }
    }

    // Check if user has existing session (OAuth only)
    async checkUserSession() {
        console.log('Checking user session...');
        
        // Wait for OAuth client to be ready and check authentication
        if (window.directSponsorAuth) {
            try {
                const isAuthenticated = await window.directSponsorAuth.isAuthenticated();
                if (isAuthenticated) {
                    console.log('User is authenticated via OAuth, loading profile...');
                    await this.loadOAuthUserProfile();
                    this.showUserInterface();
                    return;
                } else {
                    console.log('User is not authenticated or tokens expired');
                }
            } catch (error) {
                console.error('OAuth authentication check failed:', error);
            }
        } else {
            console.log('OAuth client not ready yet, will be handled by OAuth client init');
            return; // Let OAuth client handle the UI
        }
        
        // Not authenticated, show sign-in interface
        console.log('Showing sign-in interface');
        this.showSignupInterface();
    }

    // Load OAuth user profile from DirectSponsor
    async loadOAuthUserProfile() {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            throw new Error('No access token available');
        }
        
        try {
            const response = await fetch(`${this.apiBase}/api/oauth/userinfo`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                console.log('OAuth user profile loaded:', userData);
                
                // Set user data from OAuth profile - handle different possible field names
                this.userId = userData.id || userData.user_id || userData.uid;
                this.username = userData.username || userData.display_name || userData.name;
                
                console.log('Setting userId to:', this.userId);
                console.log('Setting username to:', this.username);
                
                if (!this.userId) {
                    console.error('No user ID found in OAuth profile:', userData);
                    throw new Error('Invalid user profile - missing ID');
                }
                
                // Initialize user stats (OAuth users start fresh)
                this.userStats = {
                    balance: userData.useless_coin_balance || 0,
                    totalClaims: 0,
                    canClaim: true,
                    nextClaimTime: null
                };
                
                this.updateUI();
                console.log('OAuth user authenticated - userId:', this.userId, 'username:', this.username);
            } else {
                throw new Error('Failed to load user profile');
            }
        } catch (error) {
            console.error('OAuth profile load error:', error);
            throw error;
        }
    }

    // Handle user signup (OAuth only - redirects to DirectSponsor)
    async handleSignup() {
        console.log('Signup requested - redirecting to OAuth...');
        
        // Use DirectSponsor OAuth for authentication
        if (window.loginWithDirectSponsor) {
            window.loginWithDirectSponsor();
        } else {
            this.showMessage('OAuth system not ready. Please refresh the page.', 'error');
        }
    }

    // Load user statistics from API
    async loadUserStats() {
        if (!this.userId) return;
        
        try {
            const response = await fetch(`${this.apiBase}/api/user/${this.userId}`);
            const data = await response.json();
            
            if (response.ok) {
                this.userStats = {
                    balance: data.balance,
                    totalClaims: data.totalClaims,
                    canClaim: data.canClaim,
                    nextClaimTime: data.nextClaimAvailable ? new Date(data.nextClaimAvailable) : null
                };
                
                this.updateUI();
                console.log('User stats updated:', this.userStats);
            } else {
                console.error('Failed to load user stats:', data.error);
            }
        } catch (error) {
            console.error('Stats loading error:', error);
        }
    }

    // Handle token claim - now shows captcha first
    async handleClaim() {
        console.log('handleClaim() called - userId:', this.userId, 'username:', this.username);
        console.log('Current userStats:', this.userStats);
        
        if (!this.userId) {
            console.error('No userId found - cannot proceed with claim');
            this.showMessage('Please sign up first!', 'error');
            return;
        }
        
        if (!this.userStats.canClaim) {
            const nextClaim = this.userStats.nextClaimTime;
            if (nextClaim) {
                this.showMessage(`You can claim again at ${nextClaim.toLocaleTimeString()}`, 'warning');
            }
            return;
        }
        
        // Show captcha section
        this.showCaptchaSection();
    }

    // Show hCaptcha section
    showCaptchaSection() {
        const captchaSection = document.getElementById('captcha-section');
        const claimBtn = document.getElementById('claim-btn');
        
        if (captchaSection) {
            captchaSection.style.display = 'block';
        }
        
        if (claimBtn) {
            claimBtn.style.display = 'none';
        }
        
        // Set up captcha submit button
        const captchaSubmitBtn = document.getElementById('captcha-submit-btn');
        if (captchaSubmitBtn) {
            captchaSubmitBtn.addEventListener('click', () => this.processClaim());
        }
        
        // Always show fallback button for development (real captcha only works on production domain)
        const fallbackElement = document.getElementById('captcha-fallback');
        if (fallbackElement) {
            fallbackElement.style.display = 'block';
            console.log('Development mode: Using captcha fallback for localhost testing');
        }
    }

    // Hide captcha section and show normal claim button
    hideCaptchaSection() {
        const captchaSection = document.getElementById('captcha-section');
        const claimBtn = document.getElementById('claim-btn');
        
        if (captchaSection) {
            captchaSection.style.display = 'none';
        }
        
        if (claimBtn) {
            claimBtn.style.display = 'block';
        }
        
        // Reset captcha
        this.captchaToken = null;
        if (window.hcaptcha) {
            window.hcaptcha.reset();
        }
    }

    // Process claim after captcha is solved
    async processClaim() {
        if (!this.captchaToken) {
            this.showMessage('Please complete the security check first!', 'warning');
            return;
        }
        
        const captchaSubmitBtn = document.getElementById('captcha-submit-btn');
        const originalText = captchaSubmitBtn?.textContent;
        
        try {
            if (captchaSubmitBtn) {
                captchaSubmitBtn.disabled = true;
                captchaSubmitBtn.textContent = '⏳ Processing...';
            }
            
            const response = await fetch(`${this.apiBase}/api/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    userId: this.userId,
                    captchaToken: this.captchaToken
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.userStats.balance = data.newBalance;
                this.userStats.totalClaims = data.totalClaims;
                this.userStats.canClaim = false;
                this.userStats.nextClaimTime = new Date(data.nextClaimAvailable);
                
                this.showMessage(data.message, 'success');
                this.updateUI();
                this.startCountdown();
                this.hideCaptchaSection();
                
                // Update global stats
                this.loadGlobalStats();
            } else {
                if (data.captchaError) {
                    this.showMessage('Security check failed. Please try again.', 'error');
                    // Reset captcha for retry
                    this.captchaToken = null;
                    if (window.hcaptcha) {
                        window.hcaptcha.reset();
                    }
                    this.updateCaptchaSubmitButton();
                } else {
                    this.showMessage(data.error || 'Claim failed', 'error');
                    this.hideCaptchaSection();
                }
            }
        } catch (error) {
            console.error('Claim error:', error);
            this.showMessage('Connection error. Please try again.', 'error');
            this.hideCaptchaSection();
        } finally {
            if (captchaSubmitBtn) {
                captchaSubmitBtn.disabled = false;
                captchaSubmitBtn.textContent = originalText;
            }
        }
    }

    // Update captcha submit button state
    updateCaptchaSubmitButton() {
        const captchaSubmitBtn = document.getElementById('captcha-submit-btn');
        if (!captchaSubmitBtn) return;
        
        if (this.captchaToken) {
            captchaSubmitBtn.disabled = false;
            captchaSubmitBtn.textContent = '🚀 Claim Your Tokens!';
            captchaSubmitBtn.style.background = '#4caf50';
        } else {
            captchaSubmitBtn.disabled = true;
            captchaSubmitBtn.textContent = '⏳ Complete Security Check First';
            captchaSubmitBtn.style.background = '#ccc';
        }
    }

    // Load global statistics
    async loadGlobalStats() {
        console.log('Loading global stats...');
        try {
            const response = await fetch(`${this.apiBase}/api/stats`);
            const data = await response.json();
            
            if (response.ok) {
                this.updateGlobalStats(data);
                console.log('Global stats loaded:', data);
            } else {
                console.error('Failed to load global stats:', data.error);
            }
        } catch (error) {
            console.error('Global stats loading error:', error);
        }
    }

    updateGlobalStats(stats) {
        const totalUsersEl = document.getElementById('total-users');
        const totalClaimsEl = document.getElementById('total-claims');
        const totalTokensEl = document.getElementById('total-tokens');
        
        if (totalUsersEl) {
            totalUsersEl.textContent = stats.totalUsers || 0;
            console.log('Updated total users to:', stats.totalUsers);
        }
        if (totalClaimsEl) {
            totalClaimsEl.textContent = stats.totalClaims || 0;
        }
        if (totalTokensEl) {
            totalTokensEl.textContent = stats.totalTokensDistributed || 0;
        }
    }

    // Update UI elements
    updateUI() {
        // Update username display
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay && this.username) {
            usernameDisplay.textContent = this.username;
        }
        
        // Update balance
        const balanceDisplay = document.getElementById('balance-display');
        if (balanceDisplay) {
            balanceDisplay.textContent = this.userStats.balance || 0;
        }
        
        // Update total claims
        const claimsDisplay = document.getElementById('claims-display');
        if (claimsDisplay) {
            claimsDisplay.textContent = this.userStats.totalClaims || 0;
        }
        
        // Update claim button
        const claimBtn = document.getElementById('claim-btn');
        const btnText = claimBtn?.querySelector('.btn-text');
        if (claimBtn && btnText) {
            claimBtn.disabled = !this.userStats.canClaim;
            if (this.userStats.canClaim) {
                btnText.textContent = '🎲 Claim 5 WorthlessTokens!';
            } else {
                btnText.textContent = 'Cooldown Active';
            }
        }
    }

    // Show/hide interface elements
    showSignupInterface() {
        const signupSection = document.getElementById('signup-section');
        const userSection = document.getElementById('user-section');
        
        if (signupSection) signupSection.style.display = 'block';
        if (userSection) userSection.style.display = 'none';
        
        console.log('Showing signup interface');
    }
    
    showUserInterface() {
        const signupSection = document.getElementById('signup-section');
        const userSection = document.getElementById('user-section');
        
        if (signupSection) signupSection.style.display = 'none';
        if (userSection) userSection.style.display = 'block';
        
        console.log('Showing user interface for:', this.username);
    }

    // Show messages to user
    showMessage(message, type = 'info') {
        console.log(`Message (${type}): ${message}`);
        
        const messageDiv = document.getElementById('message-display');
        if (!messageDiv) {
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

    // Start countdown timer
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

    // Start periodic updates
    startPeriodicUpdates() {
        // Update stats every 30 seconds
        setInterval(() => {
            this.loadGlobalStats();
            if (this.userId) {
                this.loadUserStats();
            }
        }, 30000);
    }
}

// Initialize the faucet when page loads - delay to let OAuth client initialize first
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, waiting for OAuth client to initialize...');
    
    // Wait a bit for OAuth client to initialize and check authentication
    setTimeout(() => {
        console.log('Initializing ROFLFaucet...');
        try {
            window.roflfaucet = new ROFLFaucet();
            console.log('ROFLFaucet initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize ROFLFaucet:', error);
        }
    }, 500); // 500ms delay
});

// Global hCaptcha callback functions
window.onCaptchaSuccess = function(token) {
    console.log('hCaptcha solved, token:', token.substring(0, 20) + '...');
    if (window.roflfaucet) {
        window.roflfaucet.captchaToken = token;
        window.roflfaucet.updateCaptchaSubmitButton();
    }
};

// Simulate captcha success for development (fallback when hCaptcha doesn't load)
window.simulateCaptchaSuccess = function() {
    console.log('Simulating captcha success for testing');
    // Generate a fake token for testing
    const fakeToken = 'test_token_' + Math.random().toString(36).substr(2, 9);
    if (window.roflfaucet) {
        window.roflfaucet.captchaToken = fakeToken;
        window.roflfaucet.updateCaptchaSubmitButton();
    }
};

// Check if hCaptcha loaded properly and show fallback if needed
setTimeout(() => {
    const captchaElement = document.querySelector('.h-captcha');
    const fallbackElement = document.getElementById('captcha-fallback');
    
    if (captchaElement && fallbackElement) {
        // Check if hCaptcha widget was rendered (it adds iframe when successful)
        const hasIframe = captchaElement.querySelector('iframe');
        
        if (!hasIframe) {
            console.log('hCaptcha widget not loaded, showing fallback');
            fallbackElement.style.display = 'block';
        }
    }
}, 3000); // Wait 3 seconds for hCaptcha to load

window.onCaptchaError = function(error) {
    console.error('hCaptcha error:', error);
    if (window.roflfaucet) {
        window.roflfaucet.showMessage('Security check failed. Please try again.', 'error');
        window.roflfaucet.captchaToken = null;
        window.roflfaucet.updateCaptchaSubmitButton();
    }
};

// Ad rotation functionality
function rotateAds() {
    // Pool of 3 placeholder ads for each slot
    const adPools = {
        1: [
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="250" viewBox="0 0 300 250"><rect width="300" height="250" fill="%23e8f4fd"/><text x="150" y="110" text-anchor="middle" font-family="Arial" font-size="16" fill="%23333">🚀 Crypto Services</text><text x="150" y="135" text-anchor="middle" font-family="Arial" font-size="14" fill="%23666">Your Ad Here</text><text x="150" y="160" text-anchor="middle" font-family="Arial" font-size="12" fill="%23999">300x250 Banner</text></svg>',
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="250" viewBox="0 0 300 250"><rect width="300" height="250" fill="%23f0f8ff"/><text x="150" y="110" text-anchor="middle" font-family="Arial" font-size="16" fill="%23333">💰 DeFi Platform</text><text x="150" y="135" text-anchor="middle" font-family="Arial" font-size="14" fill="%23666">Advertise Here</text><text x="150" y="160" text-anchor="middle" font-family="Arial" font-size="12" fill="%23999">300x250 Ad Space</text></svg>',
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="250" viewBox="0 0 300 250"><rect width="300" height="250" fill="%23fff8e7"/><text x="150" y="110" text-anchor="middle" font-family="Arial" font-size="16" fill="%23333">🌐 Blockchain Tools</text><text x="150" y="135" text-anchor="middle" font-family="Arial" font-size="14" fill="%23666">Premium Spot</text><text x="150" y="160" text-anchor="middle" font-family="Arial" font-size="12" fill="%23999">300x250 Display</text></svg>'
        ],
        2: [
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23f5f5f5"/><text x="150" y="140" text-anchor="middle" font-family="Arial" font-size="16" fill="%23333">🎮 Gaming Platform</text><text x="150" y="165" text-anchor="middle" font-family="Arial" font-size="14" fill="%23666">Play & Earn</text><text x="150" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="%23999">300x300 Square</text></svg>',
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23f0fff0"/><text x="150" y="140" text-anchor="middle" font-family="Arial" font-size="16" fill="%23333">📱 Mobile Wallet</text><text x="150" y="165" text-anchor="middle" font-family="Arial" font-size="14" fill="%23666">Secure & Fast</text><text x="150" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="%23999">300x300 Ad</text></svg>',
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23fef0ff"/><text x="150" y="140" text-anchor="middle" font-family="Arial" font-size="16" fill="%23333">🔄 Exchange</text><text x="150" y="165" text-anchor="middle" font-family="Arial" font-size="14" fill="%23666">Trade Crypto</text><text x="150" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="%23999">300x300 Banner</text></svg>'
        ],
        3: [
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="350" viewBox="0 0 300 350"><rect width="300" height="350" fill="%23fff0f0"/><text x="150" y="165" text-anchor="middle" font-family="Arial" font-size="16" fill="%23333">🏦 Crypto Bank</text><text x="150" y="190" text-anchor="middle" font-family="Arial" font-size="14" fill="%23666">Earn Interest</text><text x="150" y="215" text-anchor="middle" font-family="Arial" font-size="12" fill="%23999">300x350 Skyscraper</text></svg>',
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="350" viewBox="0 0 300 350"><rect width="300" height="350" fill="%23f0f0ff"/><text x="150" y="165" text-anchor="middle" font-family="Arial" font-size="16" fill="%23333">🔒 Security Suite</text><text x="150" y="190" text-anchor="middle" font-family="Arial" font-size="14" fill="%23666">Protect Assets</text><text x="150" y="215" text-anchor="middle" font-family="Arial" font-size="12" fill="%23999">300x350 Tower</text></svg>',
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="350" viewBox="0 0 300 350"><rect width="300" height="350" fill="%23f8f8f0"/><text x="150" y="165" text-anchor="middle" font-family="Arial" font-size="16" fill="%23333">📈 Trading Bot</text><text x="150" y="190" text-anchor="middle" font-family="Arial" font-size="14" fill="%23666">Auto Profit</text><text x="150" y="215" text-anchor="middle" font-family="Arial" font-size="12" fill="%23999">300x350 Tall</text></svg>'
        ]
    };
    
    // Rotate ads for each slot
    document.querySelectorAll('.rotating-ad').forEach(function(img) {
        const slot = parseInt(img.dataset.adSlot);
        if (adPools[slot]) {
            const randomAd = adPools[slot][Math.floor(Math.random() * adPools[slot].length)];
            img.src = randomAd;
        }
    });
    
    console.log('Ads rotated');
}

// Rotate ads on page load and every 30 seconds
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 Setting up additional UI functionality...');
    
    // Add event listeners for buttons that had onclick handlers removed due to CSP
    const simulateCaptchaBtn = document.getElementById('simulate-captcha-btn');
    if (simulateCaptchaBtn) {
        simulateCaptchaBtn.addEventListener('click', function() {
            if (window.simulateCaptchaSuccess) {
                window.simulateCaptchaSuccess();
            }
        });
    }
    
    const charityImpactBtn = document.getElementById('charity-impact-btn');
    if (charityImpactBtn) {
        charityImpactBtn.addEventListener('click', function() {
            if (window.showCharityPromotion) {
                window.showCharityPromotion();
            }
        });
    }
    
    const achievementsBtn = document.getElementById('achievements-btn');
    if (achievementsBtn) {
        achievementsBtn.addEventListener('click', function() {
            if (window.showAchievements) {
                window.showAchievements();
            }
        });
    }
    
    rotateAds();
    setInterval(rotateAds, 30000); // Rotate every 30 seconds
    
    // Load initial video on page load
    loadNewVideo();
    
    // Wait a bit for DOM to be fully ready, then load sidebar media
    // TEMPORARILY DISABLED FOR TESTING - uncomment when ready
    /*
    setTimeout(() => {
        console.log('⏰ Timeout reached, loading sidebar media...');
        loadSidebarMedia();
    }, 2000); // Wait 2 seconds
    */
    console.log('📋 Sidebar media loading temporarily disabled for testing');
    
    // Media content loads once per page load - no auto-refresh needed
    // Different content will appear on each page refresh
});

// Load media content for specific sidebar slots
function loadSidebarMedia() {
    console.log('🎭 loadSidebarMedia() called - starting Giphy load...');
    
    // Load Giphy content into its dedicated slot
    console.log('🌐 Fetching /api/image/random...');
    fetch('/api/image/random')
    .then(response => response.json())
    .then(data => {
        console.log('✅ Giphy API response:', data);
        const giphyContent = document.getElementById('giphy-content');
        if (!giphyContent) {
            console.error('❌ giphy-content element not found!');
            return;
        }
        
        if (data.embedUrl) {
            // Fix HTML entity encoding in embed URL
            const cleanUrl = data.embedUrl.replace(/&amp;/g, '&');
            console.log('🎭 Creating Giphy iframe with URL:', cleanUrl);
            // Create iframe with proper styling for Giphy embeds
            const iframe = document.createElement('iframe');
            iframe.src = cleanUrl;
            iframe.width = '100%';
            iframe.height = '250';
            iframe.frameBorder = '0';
            iframe.className = 'giphy-embed';
            iframe.allowFullscreen = true;
            
            // Clear and insert iframe
            giphyContent.innerHTML = '';
            giphyContent.appendChild(iframe);
            
            console.log('✅ Giphy iframe inserted successfully!');
        } else {
            console.error('❌ No embedUrl in Giphy response');
            giphyContent.innerHTML = 'Failed to load Giphy content.';
        }
    })
    .catch(error => {
        console.error('Error loading Giphy content:', error);
        const giphyContent = document.getElementById('giphy-content');
        giphyContent.innerHTML = 'Error loading Giphy content. Please try again later.';
    });

    // Load Imgur content into its dedicated slot
    fetch('/api/media/random')
    .then(response => response.json())
    .then(data => {
        const imgurContent = document.getElementById('imgur-content');
        if (data.embedHtml) {
            imgurContent.innerHTML = data.embedHtml;
            
            // Execute any scripts in the embed HTML
            const scripts = imgurContent.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                const script = scripts[i];
                const newScript = document.createElement('script');
                if (script.src) {
                    newScript.src = script.src;
                } else {
                    newScript.textContent = script.textContent;
                }
                newScript.async = script.async;
                document.head.appendChild(newScript);
            }
        } else {
            imgurContent.innerHTML = 'Failed to load Imgur content.';
        }
    })
    .catch(error => {
        console.error('Error loading Imgur content:', error);
        const imgurContent = document.getElementById('imgur-content');
        imgurContent.innerHTML = 'Error loading Imgur content. Please try again later.';
    });
}

// Load Giphy content (function no longer needed)
function loadGiphyContent() {
    const giphySlots = document.querySelectorAll('.rotating-ad[data-ad-slot="1"]'); // Single Giphy slot
    
    giphySlots.forEach(async (slot, index) => {
        if (Math.random() < 0.4) { // 40% chance for Giphy content
            try {
                const response = await fetch('/api/image/random');
                const media = await response.json();
                
                if (response.ok && media && media.embedUrl) {
                    const container = slot.parentElement;
                    const adContent = container.querySelector('.ad-content');
                    
                    if (adContent) {
                        // Create Giphy container
                        const mediaContainer = document.createElement('div');
                        mediaContainer.className = 'sidebar-media-container giphy-content';
                        mediaContainer.style.cssText = `
                            width: 100%;
                            height: auto;
                            border-radius: 8px;
                            overflow: hidden;
                            background: #f8f9fa;
                            border: 2px solid #00D924; /* Giphy green */
                        `;
                        
                        // Add Giphy iframe
                        const iframe = document.createElement('iframe');
                        iframe.src = media.embedUrl;
                        iframe.width = '100%';
                        iframe.height = '250';
                        iframe.frameBorder = '0';
                        iframe.allowFullscreen = true;
                        mediaContainer.appendChild(iframe);
                        
                        // Replace ad content temporarily
                        const originalContent = adContent.innerHTML;
                        adContent.innerHTML = '';
                        adContent.appendChild(mediaContainer);
                        
                        // Update header to show Giphy
                        const adHeader = container.querySelector('.ad-label');
                        const originalLabel = adHeader ? adHeader.textContent : '';
                        if (adHeader) {
                            adHeader.textContent = '🎭 Giphy Content';
                            adHeader.style.background = '#00D924';
                            adHeader.style.color = 'white';
                        }
                        
                        console.log('✅ Loaded Giphy content:', media.title);
                        
                        // Restore after 35 seconds
                        setTimeout(() => {
                            if (adContent) {
                                adContent.innerHTML = originalContent;
                            }
                            if (adHeader) {
                                adHeader.textContent = originalLabel;
                                adHeader.style.background = '';
                                adHeader.style.color = '';
                            }
                        }, 35000);
                    }
                }
            } catch (error) {
                console.log('❌ Giphy load error:', error.message);
            }
        }
    });
}

// Load Imgur content for specific slot (one per provider for TOS compliance)
async function loadImgurContent() {
    const imgurSlots = document.querySelectorAll('.rotating-ad[data-ad-slot="2"]'); // Single Imgur slot
    
    imgurSlots.forEach(async (slot, index) => {
        if (Math.random() < 0.4) { // 40% chance for Imgur content
            try {
                const response = await fetch('/api/media/random');
                const media = await response.json();
                
                if (response.ok && media && media.type === 'imgur-album') {
                    const container = slot.parentElement;
                    const adContent = container.querySelector('.ad-content');
                    
                    if (adContent) {
                        // Create Imgur container
                        const mediaContainer = document.createElement('div');
                        mediaContainer.className = 'sidebar-media-container imgur-content';
                        mediaContainer.style.cssText = `
                            width: 100%;
                            height: auto;
                            border-radius: 8px;
                            overflow: hidden;
                            background: #f8f9fa;
                            border: 2px solid #1BB76E; /* Imgur green */
                        `;
                        
                        // Add Imgur embed
                        mediaContainer.innerHTML = media.embedHtml;
                        
                        // Replace ad content temporarily
                        const originalContent = adContent.innerHTML;
                        adContent.innerHTML = '';
                        adContent.appendChild(mediaContainer);
                        
                        // Load Imgur script if needed
                        if (media.embedHtml && media.embedHtml.includes('embed.js')) {
                            loadImgurEmbedScript();
                        }
                        
                        // Update header to show Imgur
                        const adHeader = container.querySelector('.ad-label');
                        const originalLabel = adHeader ? adHeader.textContent : '';
                        if (adHeader) {
                            adHeader.textContent = '🖼️ Imgur Content';
                            adHeader.style.background = '#1BB76E';
                            adHeader.style.color = 'white';
                        }
                        
                        console.log('✅ Loaded Imgur content:', media.title);
                        
                        // Restore after 35 seconds
                        setTimeout(() => {
                            if (adContent) {
                                adContent.innerHTML = originalContent;
                            }
                            if (adHeader) {
                                adHeader.textContent = originalLabel;
                                adHeader.style.background = '';
                                adHeader.style.color = '';
                            }
                        }, 35000);
                    }
                }
            } catch (error) {
                console.log('❌ Imgur load error:', error.message);
            }
        }
    });
}

// Enhanced Media loading functionality - supports videos, images, and smart format selection
async function loadNewVideo() {
    const mediaContainer = document.getElementById('video-container');
    const odyseePromotion = document.getElementById('odysee-promotion');
    
    if (!mediaContainer) {
        console.log('Media container not found');
        return;
    }
    
    try {
        console.log('Loading new YouTube video...');
        
        // Show loading state
        mediaContainer.style.opacity = '0.5';
        
        // Use YouTube video API for main content area
        const response = await fetch('/api/video/random');
        const media = await response.json();
        
        if (response.ok && media) {
            console.log('Loaded YouTube video:', media.title);
            
            // Display as YouTube iframe (main content area only shows YouTube)
            displayIframe(media, mediaContainer);
            
            // Handle YouTube channel promotions
            handlePlatformPromotions(media, odyseePromotion);
            
            // Restore opacity
            mediaContainer.style.opacity = '1';
        } else {
            console.error('Failed to load YouTube video:', media);
            showFallbackContent(mediaContainer);
        }
        
    } catch (error) {
        console.error('Error loading media:', error);
        showErrorContent(mediaContainer);
    }
}

// Display media based on type and format selection
async function displayMedia(media, container) {
    const displayMethod = media.displayMethod || getDisplayMethodFromMedia(media);
    
    switch (displayMethod) {
        case 'embed-html':
            // Imgur albums and custom HTML embeds
            displayEmbedHtml(media, container);
            break;
            
        case 'iframe':
            // YouTube, Odysee, Giphy iframes
            displayIframe(media, container);
            break;
            
        case 'smart-image':
            // Smart format selection for images (MP4 vs GIF)
            await displaySmartImage(media, container);
            break;
            
        default:
            // Fallback to iframe
            displayIframe(media, container);
    }
}

// Display HTML embed content (Imgur albums)
function displayEmbedHtml(media, container) {
    if (media.embedHtml) {
        container.innerHTML = media.embedHtml;
        
        // If it's an Imgur embed, make sure the script loads
        if (media.platform === 'imgur' && media.embedHtml.includes('embed.js')) {
            loadImgurEmbedScript();
        }
    } else {
        showFallbackContent(container);
    }
}

// Display iframe content (YouTube, Odysee, Giphy)
function displayIframe(media, container) {
    const iframe = container.querySelector('iframe') || document.createElement('iframe');
    
    // Set iframe attributes
    iframe.id = 'video-embed';
    iframe.width = '100%';
    iframe.height = '315';
    iframe.frameBorder = '0';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    iframe.src = media.embedUrl || media.url;
    
    // Set appropriate permissions based on media type
    if (media.platform === 'youtube' || media.platform === 'odysee') {
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.sandbox = 'allow-scripts allow-same-origin allow-presentation allow-forms';
    }
    
    // Clear container and add iframe
    container.innerHTML = '';
    container.appendChild(iframe);
}

// Smart image display with format selection (MP4 vs GIF)
async function displaySmartImage(media, container) {
    const supportsMP4 = canPlayMP4();
    const preferredFormat = supportsMP4 ? 'mp4' : 'gif';
    
    // Determine optimal URL
    let mediaUrl;
    if (media.formatOptions && media.selectedFormat) {
        mediaUrl = media.selectedFormat.url;
    } else if (media.imgurId) {
        // Smart Imgur URL selection
        mediaUrl = `https://i.imgur.com/${media.imgurId}.${preferredFormat}`;
    } else {
        mediaUrl = media.url || media.directUrl;
    }
    
    if (supportsMP4 && preferredFormat === 'mp4') {
        // Use HTML5 video for MP4
        displayAsVideo(mediaUrl, container, media);
    } else {
        // Use image tag for GIF
        displayAsImage(mediaUrl, container, media);
    }
}

// Display as HTML5 video with auto-loop
function displayAsVideo(videoUrl, container, media) {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.autoplay = true;
    video.loop = true;
    video.muted = true; // Required for autoplay in most browsers
    video.controls = false;
    video.style.width = '100%';
    video.style.height = 'auto';
    video.style.borderRadius = '8px';
    
    // Add error handling
    video.onerror = () => {
        console.log('Video failed to load, falling back to GIF');
        const gifUrl = videoUrl.replace('.mp4', '.gif');
        displayAsImage(gifUrl, container, media);
    };
    
    container.innerHTML = '';
    container.appendChild(video);
}

// Display as image (GIF)
function displayAsImage(imageUrl, container, media) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = media.title || 'Funny image';
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = '8px';
    
    // Add error handling
    img.onerror = () => {
        console.log('Image failed to load, showing fallback');
        showFallbackContent(container);
    };
    
    container.innerHTML = '';
    container.appendChild(img);
}

// Check if browser can play MP4 videos
function canPlayMP4() {
    const video = document.createElement('video');
    return video.canPlayType && video.canPlayType('video/mp4') !== '';
}

// Determine display method from media object
function getDisplayMethodFromMedia(media) {
    if (media.type === 'imgur-album' || media.embedHtml) {
        return 'embed-html';
    } else if (media.platform === 'youtube' || media.platform === 'odysee' || media.type === 'giphy') {
        return 'iframe';
    } else if (media.imgurId || (media.formatOptions && media.formatOptions.length > 1)) {
        return 'smart-image';
    } else {
        return 'iframe';
    }
}

// Load Imgur embed script if needed
function loadImgurEmbedScript() {
    // Check if script is already loaded
    if (document.querySelector('script[src*="imgur.com/min/embed.js"]')) {
        return;
    }
    
    const script = document.createElement('script');
    script.async = true;
    script.src = '//s.imgur.com/min/embed.js';
    script.charset = 'utf-8';
    document.head.appendChild(script);
}

// Handle platform-specific promotions
function handlePlatformPromotions(media, odyseePromotion) {
    if (odyseePromotion) {
        if (media.showChannelPromotion && media.platform === 'odysee') {
            odyseePromotion.style.display = 'block';
        } else {
            odyseePromotion.style.display = 'none';
        }
    }
}

// Show fallback content
function showFallbackContent(container) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; background: #f5f5f5; border-radius: 8px;"><p>😢 Media temporarily unavailable</p><p><small>Please try again later</small></p></div>';
}

// Show error content
function showErrorContent(container) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; background: #f5f5f5; border-radius: 8px;"><p>📡 Connection error</p><p><small>Please check your internet connection</small></p></div>';
}

// Manual test function for browser console debugging
window.testGiphyLoad = function() {
    console.log('🧪 Manual Giphy test starting...');
    const giphyContent = document.getElementById('giphy-content');
    if (!giphyContent) {
        console.error('❌ giphy-content element not found!');
        return;
    }
    console.log('✅ giphy-content element found:', giphyContent);
    
    fetch('/api/image/random')
    .then(response => response.json())
    .then(data => {
        console.log('🎭 Manual test API response:', data);
        if (data.embedUrl) {
            giphyContent.innerHTML = `<iframe src="${data.embedUrl}" width="100%" height="250" frameborder="0" class="giphy-embed" allowfullscreen></iframe>`;
            console.log('✅ Giphy iframe inserted manually!');
        } else {
            console.error('❌ No embedUrl in response');
        }
    })
    .catch(error => {
        console.error('❌ Manual test error:', error);
    });
};

