// ROFLFaucet Centralized Database JavaScript
// This version uses the secure centralized database API directly
console.log('ROFLFaucet Centralized script loading...');

class ROFLFaucetCentralized {
    constructor() {
        // Configuration for centralized database API
        this.dbApiBase = 'http://auth.directsponsor.org:3002';
        this.authApiBase = 'https://auth.directsponsor.org';
        
        // User state
        this.userEmail = null;
        this.userProfile = null;
        this.userStats = {
            balance: 0,
            totalClaims: 0,
            canClaim: true,
            nextClaimTime: null
        };
        this.captchaToken = null;
        
        console.log('ROFLFaucet Centralized initialized');
        this.init();
    }

    init() {
        console.log('Initializing centralized version...');
        this.setupEventListeners();
        this.checkUserSession();
        this.loadGlobalStats();
        this.startPeriodicUpdates();
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Auth modal functionality
        this.setupAuthModal();
        
        // Start claiming button
        const startClaimBtn = document.getElementById('start-claiming-btn');
        if (startClaimBtn) {
            startClaimBtn.addEventListener('click', () => this.showAuthModal());
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
        
        // Refresh stats button
        const refreshBtn = document.getElementById('refresh-stats');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadGlobalStats());
        }
        
        // Captcha callbacks
        window.hcaptchaCallback = (token) => {
            console.log('hCaptcha solved');
            this.captchaToken = token;
            this.updateCaptchaSubmitButton();
        };
        
        window.hcaptchaExpired = () => {
            console.log('hCaptcha expired');
            this.captchaToken = null;
            this.updateCaptchaSubmitButton();
        };
    }

    setupAuthModal() {
        // Modal close button
        const modalCloseBtn = document.getElementById('modal-close-btn');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => this.hideAuthModal());
        }
        
        // Tab switching
        const loginTabBtn = document.getElementById('modal-login-tab-btn');
        const signupTabBtn = document.getElementById('modal-signup-tab-btn');
        
        if (loginTabBtn) {
            loginTabBtn.addEventListener('click', () => this.switchModalTab('login'));
        }
        if (signupTabBtn) {
            signupTabBtn.addEventListener('click', () => this.switchModalTab('signup'));
        }
        
        // Form submissions
        const loginForm = document.getElementById('modal-login-form');
        const signupForm = document.getElementById('modal-signup-form');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup();
            });
        }
        
        // Click outside modal to close
        const modalOverlay = document.getElementById('auth-modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.hideAuthModal();
                }
            });
        }
    }

    // Authentication Methods
    
    async handleLogin() {
        const email = document.getElementById('modal-login-email').value;
        const password = document.getElementById('modal-login-password').value;
        
        if (!email || !password) {
            this.showAuthError('Please fill in all fields');
            return;
        }
        
        try {
            // For simplified authentication, just check if user exists in database
            const response = await fetch(`${this.dbApiBase}/api/users/${encodeURIComponent(email)}`);
            
            if (response.ok) {
                const userData = await response.json();
                
                // Store user session (simplified - no password verification in this version)
                localStorage.setItem('roflfaucet_userEmail', email);
                localStorage.setItem('roflfaucet_sessionToken', 'centralized_token');
                
                this.userEmail = email;
                this.hideAuthModal();
                await this.loadUserProfile();
                this.showUserInterface();
                this.showMessage('Successfully signed in!', 'success');
            } else {
                this.showAuthError('User not found. Please sign up first.');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAuthError('Connection error. Please try again.');
        }
    }
    
    async handleSignup() {
        const username = document.getElementById('modal-signup-username').value;
        const email = document.getElementById('modal-signup-email').value;
        const password = document.getElementById('modal-signup-password').value;
        const confirmPassword = document.getElementById('modal-signup-confirm').value;
        
        if (!username || !email || !password || !confirmPassword) {
            this.showAuthError('Please fill in all fields');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showAuthError('Passwords do not match');
            return;
        }
        
        if (password.length < 8) {
            this.showAuthError('Password must be at least 8 characters');
            return;
        }
        
        try {
            // Create user in centralized database
            const response = await fetch(`${this.dbApiBase}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    username,
                    display_name: username,
                    source: 'roflfaucet_signup'
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store user session
                localStorage.setItem('roflfaucet_userEmail', email);
                localStorage.setItem('roflfaucet_sessionToken', 'demo_token');
                
                this.userEmail = email;
                this.hideAuthModal();
                await this.loadUserProfile();
                this.showUserInterface();
                this.showMessage('Account created successfully! Welcome to ROFLFaucet!', 'success');
            } else {
                this.showAuthError(data.error || 'Signup failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showAuthError('Connection error. Please try again.');
        }
    }
    
    async checkUserSession() {
        console.log('Checking user session...');
        
        const savedEmail = localStorage.getItem('roflfaucet_userEmail');
        const sessionToken = localStorage.getItem('roflfaucet_sessionToken');
        
        if (savedEmail && sessionToken) {
            console.log('Found existing session:', savedEmail);
            this.userEmail = savedEmail;
            await this.loadUserProfile();
            this.showUserInterface();
        } else {
            console.log('No existing session, showing welcome interface');
            this.showWelcomeInterface();
        }
    }
    
    async loadUserProfile() {
        if (!this.userEmail) return;
        
        try {
            console.log('Loading user profile from centralized database...');
            const response = await fetch(`${this.dbApiBase}/api/users/${encodeURIComponent(this.userEmail)}`);
            const userData = await response.json();
            
            if (response.ok) {
                this.userProfile = {
                    email: userData.email,
                    username: userData.username || userData.display_name,
                    id: userData.id
                };
                
                console.log('User profile loaded:', this.userProfile);
                await this.loadUserStats();
            } else {
                console.warn('User not found in database, will be created on first claim');
                this.userProfile = {
                    email: this.userEmail,
                    username: this.userEmail.split('@')[0],
                    id: this.userEmail
                };
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    }
    
    async loadUserStats() {
        if (!this.userEmail) return;
        
        try {
            console.log('Loading user stats from centralized database...');
            const response = await fetch(`${this.dbApiBase}/api/balances/${encodeURIComponent(this.userEmail)}`);
            const balanceData = await response.json();
            
            if (response.ok) {
                this.userStats = {
                    balance: balanceData.useless_coin_balance || 0,
                    totalClaims: balanceData.total_claims || 0,
                    canClaim: true, // Will be determined by claim timing
                    nextClaimTime: null
                };
                
                console.log('User stats loaded:', this.userStats);
                this.updateUI();
            } else {
                console.log('No existing balance, user will start with 0');
                this.userStats = {
                    balance: 0,
                    totalClaims: 0,
                    canClaim: true,
                    nextClaimTime: null
                };
            }
        } catch (error) {
            console.error('Failed to load user stats:', error);
        }
    }
    
    // Claim Processing
    
    async handleClaim() {
        console.log('handleClaim() called - userEmail:', this.userEmail);
        
        if (!this.userEmail) {
            console.error('No userEmail found - cannot proceed with claim');
            this.showMessage('Please sign in first!', 'error');
            this.showAuthModal();
            return;
        }
        
        // Show captcha section
        this.showCaptchaSection();
    }
    
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
            
            console.log('🎮 Processing claim via centralized database...');
            
            // First ensure user exists in database
            await this.ensureUserExists();
            
            // Process the claim
            const response = await fetch(`${this.dbApiBase}/api/balances/${encodeURIComponent(this.userEmail)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currency: 'useless_coin',
                    amount: 5,
                    transaction_type: 'faucet_claim',
                    source: 'roflfaucet'
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update user stats
                this.userStats.balance = data.new_balance;
                this.userStats.totalClaims += 1;
                this.userStats.canClaim = false;
                this.userStats.nextClaimTime = new Date(Date.now() + (15 * 60 * 1000)); // 15 minutes
                
                this.showMessage(`🎉 Successfully claimed 5 UselessCoins! New balance: ${data.new_balance} UC`, 'success');
                this.updateUI();
                this.startCountdown();
                this.hideCaptchaSection();
                
                // Update global stats
                this.loadGlobalStats();
                
                console.log('✅ Claim successful via centralized database');
            } else {
                throw new Error(data.error || 'Claim failed');
            }
            
        } catch (error) {
            console.error('Claim error:', error);
            this.showMessage(error.message || 'Connection error. Please try again.', 'error');
            this.hideCaptchaSection();
        } finally {
            if (captchaSubmitBtn) {
                captchaSubmitBtn.disabled = false;
                captchaSubmitBtn.textContent = originalText;
            }
        }
    }
    
    async ensureUserExists() {
        try {
            // Try to create user (will succeed if user doesn't exist, fail silently if they do)
            await fetch(`${this.dbApiBase}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: this.userEmail,
                    username: this.userProfile?.username || this.userEmail.split('@')[0],
                    display_name: this.userProfile?.username || this.userEmail.split('@')[0],
                    source: 'roflfaucet_claim'
                })
            });
        } catch (error) {
            // User might already exist, which is fine
            console.log('User creation attempted (may already exist)');
        }
    }
    
    // UI Methods
    
    showWelcomeInterface() {
        const welcomeSection = document.getElementById('welcome-section');
        const userInterface = document.getElementById('user-interface');
        
        if (welcomeSection) welcomeSection.style.display = 'block';
        if (userInterface) userInterface.style.display = 'none';
    }
    
    showUserInterface() {
        const welcomeSection = document.getElementById('welcome-section');
        const userInterface = document.getElementById('user-interface');
        
        if (welcomeSection) welcomeSection.style.display = 'none';
        if (userInterface) userInterface.style.display = 'block';
        
        this.updateUI();
    }
    
    showAuthModal() {
        const modalOverlay = document.getElementById('auth-modal-overlay');
        if (modalOverlay) {
            modalOverlay.style.display = 'flex';
            this.switchModalTab('login'); // Default to login tab
        }
    }
    
    hideAuthModal() {
        const modalOverlay = document.getElementById('auth-modal-overlay');
        if (modalOverlay) {
            modalOverlay.style.display = 'none';
        }
        this.clearAuthError();
    }
    
    switchModalTab(tab) {
        // Remove active classes
        document.querySelectorAll('.modal-container .tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.modal-container .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active class to selected tab
        const targetButton = document.getElementById(`modal-${tab}-tab-btn`);
        const targetTab = document.getElementById(`modal-${tab}-tab`);
        
        if (targetButton) targetButton.classList.add('active');
        if (targetTab) targetTab.classList.add('active');
        
        this.clearAuthError();
    }
    
    showAuthError(message) {
        const errorDisplay = document.getElementById('auth-error-display');
        if (errorDisplay) {
            errorDisplay.textContent = message;
            errorDisplay.style.display = 'block';
        }
    }
    
    clearAuthError() {
        const errorDisplay = document.getElementById('auth-error-display');
        if (errorDisplay) {
            errorDisplay.style.display = 'none';
        }
    }
    
    showCaptchaSection() {
        const captchaSection = document.getElementById('captcha-section');
        const claimBtn = document.getElementById('claim-btn');
        
        if (captchaSection) captchaSection.style.display = 'block';
        if (claimBtn) claimBtn.style.display = 'none';
        
        // Set up captcha submit button
        const captchaSubmitBtn = document.getElementById('captcha-submit-btn');
        if (captchaSubmitBtn) {
            captchaSubmitBtn.addEventListener('click', () => this.processClaim());
        }
        
        // Show fallback for development
        const fallbackElement = document.getElementById('captcha-fallback');
        if (fallbackElement) {
            fallbackElement.style.display = 'block';
        }
    }
    
    hideCaptchaSection() {
        const captchaSection = document.getElementById('captcha-section');
        const claimBtn = document.getElementById('claim-btn');
        
        if (captchaSection) captchaSection.style.display = 'none';
        if (claimBtn) claimBtn.style.display = 'block';
        
        // Reset captcha
        this.captchaToken = null;
        if (window.hcaptcha) {
            window.hcaptcha.reset();
        }
    }
    
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
    
    updateUI() {
        // Update username display
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay && this.userProfile) {
            usernameDisplay.textContent = this.userProfile.username;
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
                btnText.textContent = '🎲 Claim 5 UselessCoins!';
            } else {
                btnText.textContent = 'Cooldown Active';
            }
        }
    }
    
    async loadGlobalStats() {
        try {
            const response = await fetch(`${this.dbApiBase}/api/stats`);
            
            if (response.ok) {
                const stats = await response.json();
                this.updateGlobalStats(stats);
                console.log('Global stats loaded from centralized database:', stats);
            } else {
                console.error('Failed to load global stats');
            }
        } catch (error) {
            console.error('Global stats loading error:', error);
            // Use fallback demo stats
            this.updateGlobalStats({
                totalUsers: 1247,
                totalClaims: 8934,
                totalTokensDistributed: 44670
            });
        }
    }
    
    updateGlobalStats(stats) {
        const totalUsersEl = document.getElementById('total-users');
        const totalClaimsEl = document.getElementById('total-claims');
        const totalTokensEl = document.getElementById('total-tokens');
        
        if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers || stats.total_users || 0;
        if (totalClaimsEl) totalClaimsEl.textContent = stats.totalClaims || stats.total_claims || 0;
        if (totalTokensEl) totalTokensEl.textContent = stats.totalTokensDistributed || stats.total_tokens_distributed || 0;
    }
    
    startCountdown() {
        if (!this.userStats.nextClaimTime) return;
        
        const updateCountdown = () => {
            const now = new Date();
            const timeLeft = this.userStats.nextClaimTime - now;
            
            if (timeLeft <= 0) {
                this.userStats.canClaim = true;
                this.updateUI();
                return;
            }
            
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            
            const claimBtn = document.getElementById('claim-btn');
            const btnText = claimBtn?.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = `Next claim in ${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            setTimeout(updateCountdown, 1000);
        };
        
        updateCountdown();
    }
    
    startPeriodicUpdates() {
        // Refresh stats every 5 minutes
        setInterval(() => {
            this.loadGlobalStats();
            if (this.userEmail) {
                this.loadUserStats();
            }
        }, 5 * 60 * 1000);
    }
    
    showMessage(message, type = 'info') {
        // Create or update message element
        let messageEl = document.getElementById('global-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'global-message';
            messageEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: bold;
                z-index: 10000;
                max-width: 300px;
                word-wrap: break-word;
            `;
            document.body.appendChild(messageEl);
        }
        
        // Set color based on type
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };
        
        messageEl.style.backgroundColor = colors[type] || colors.info;
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ROFLFaucet Centralized...');
    window.roflfaucet = new ROFLFaucetCentralized();
});

// Fallback for older browsers
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.roflfaucet = new ROFLFaucetCentralized();
    });
} else {
    window.roflfaucet = new ROFLFaucetCentralized();
}

