// ROFLFaucet Simple Script - Works immediately with local storage
console.log('ROFLFaucet Simple script loading...');

class ROFLFaucetSimple {
    constructor() {
        this.userEmail = null;
        this.userProfile = null;
        this.userStats = {
            balance: 0,
            totalClaims: 0,
            canClaim: true,
            nextClaimTime: null
        };
        this.captchaToken = null;
        
        console.log('ROFLFaucet Simple initialized');
        this.init();
    }

    init() {
        console.log('Initializing simple version...');
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

    // Authentication Methods - Simple local storage
    
    async handleLogin() {
        const email = document.getElementById('modal-login-email').value;
        const password = document.getElementById('modal-login-password').value;
        
        if (!email || !password) {
            this.showAuthError('Please fill in all fields');
            return;
        }
        
        // Simple check - just use email as identifier
        const savedUser = localStorage.getItem(`roflfaucet_user_${email}`);
        if (savedUser) {
            const userData = JSON.parse(savedUser);
            if (userData.password === password) {
                this.userEmail = email;
                this.userProfile = userData;
                localStorage.setItem('roflfaucet_userEmail', email);
                localStorage.setItem('roflfaucet_sessionToken', 'simple_token');
                
                this.hideAuthModal();
                this.loadUserStats();
                this.showUserInterface();
                this.showMessage('Successfully signed in!', 'success');
            } else {
                this.showAuthError('Invalid password');
            }
        } else {
            this.showAuthError('User not found. Please sign up first.');
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
        
        // Check if user already exists
        const existingUser = localStorage.getItem(`roflfaucet_user_${email}`);
        if (existingUser) {
            this.showAuthError('User already exists. Please sign in instead.');
            return;
        }
        
        // Create new user
        const userData = {
            email: email,
            username: username,
            display_name: username,
            password: password, // In real app, this would be hashed
            created_at: new Date().toISOString()
        };
        
        localStorage.setItem(`roflfaucet_user_${email}`, JSON.stringify(userData));
        localStorage.setItem('roflfaucet_userEmail', email);
        localStorage.setItem('roflfaucet_sessionToken', 'simple_token');
        
        this.userEmail = email;
        this.userProfile = userData;
        
        // Initialize user stats
        this.userStats = {
            balance: 0,
            totalClaims: 0,
            canClaim: true,
            nextClaimTime: null
        };
        this.saveUserStats();
        
        this.hideAuthModal();
        this.showUserInterface();
        this.showMessage('Account created successfully! Welcome to ROFLFaucet!', 'success');
    }
    
    checkUserSession() {
        console.log('Checking user session...');
        
        const savedEmail = localStorage.getItem('roflfaucet_userEmail');
        const sessionToken = localStorage.getItem('roflfaucet_sessionToken');
        
        if (savedEmail && sessionToken) {
            console.log('Found existing session:', savedEmail);
            this.userEmail = savedEmail;
            
            const userData = localStorage.getItem(`roflfaucet_user_${savedEmail}`);
            if (userData) {
                this.userProfile = JSON.parse(userData);
                this.loadUserStats();
                this.showUserInterface();
            } else {
                // Clean up invalid session
                localStorage.removeItem('roflfaucet_userEmail');
                localStorage.removeItem('roflfaucet_sessionToken');
                this.showWelcomeInterface();
            }
        } else {
            console.log('No existing session, showing welcome interface');
            this.showWelcomeInterface();
        }
    }
    
    loadUserStats() {
        if (!this.userEmail) return;
        
        const savedStats = localStorage.getItem(`roflfaucet_stats_${this.userEmail}`);
        if (savedStats) {
            this.userStats = JSON.parse(savedStats);
            
            // Check if claim cooldown has expired
            if (this.userStats.nextClaimTime) {
                const nextClaim = new Date(this.userStats.nextClaimTime);
                if (new Date() >= nextClaim) {
                    this.userStats.canClaim = true;
                    this.userStats.nextClaimTime = null;
                } else {
                    this.userStats.canClaim = false;
                    this.startCountdown();
                }
            }
        } else {
            this.userStats = {
                balance: 0,
                totalClaims: 0,
                canClaim: true,
                nextClaimTime: null
            };
        }
        
        this.updateUI();
    }
    
    saveUserStats() {
        if (!this.userEmail) return;
        localStorage.setItem(`roflfaucet_stats_${this.userEmail}`, JSON.stringify(this.userStats));
    }
    
    // Claim Processing - Simple local version
    
    handleClaim() {
        console.log('handleClaim() called - userEmail:', this.userEmail);
        
        if (!this.userEmail) {
            console.error('No userEmail found - cannot proceed with claim');
            this.showMessage('Please sign in first!', 'error');
            this.showAuthModal();
            return;
        }
        
        if (!this.userStats.canClaim) {
            this.showMessage('You must wait before claiming again!', 'warning');
            return;
        }
        
        // Show captcha section
        this.showCaptchaSection();
    }
    
    processClaim() {
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
            
            console.log('🎮 Processing claim locally...');
            
            // Simulate processing delay
            setTimeout(() => {
                // Award tokens
                this.userStats.balance += 5;
                this.userStats.totalClaims += 1;
                this.userStats.canClaim = false;
                this.userStats.nextClaimTime = new Date(Date.now() + (15 * 60 * 1000)); // 15 minutes
                
                this.saveUserStats();
                
                this.showMessage(`🎉 Successfully claimed 5 UselessCoins! New balance: ${this.userStats.balance} UC`, 'success');
                this.updateUI();
                this.startCountdown();
                this.hideCaptchaSection();
                
                // Update global stats
                this.incrementGlobalStats();
                
                console.log('✅ Claim successful locally');
                
                if (captchaSubmitBtn) {
                    captchaSubmitBtn.disabled = false;
                    captchaSubmitBtn.textContent = originalText;
                }
            }, 1000);
            
        } catch (error) {
            console.error('Claim error:', error);
            this.showMessage(error.message || 'Processing error. Please try again.', 'error');
            this.hideCaptchaSection();
            
            if (captchaSubmitBtn) {
                captchaSubmitBtn.disabled = false;
                captchaSubmitBtn.textContent = originalText;
            }
        }
    }
    
    incrementGlobalStats() {
        let globalStats = localStorage.getItem('roflfaucet_global_stats');
        if (globalStats) {
            globalStats = JSON.parse(globalStats);
        } else {
            globalStats = {
                totalUsers: 0,
                totalClaims: 0,
                totalTokensDistributed: 0
            };
        }
        
        globalStats.totalClaims += 1;
        globalStats.totalTokensDistributed += 5;
        
        localStorage.setItem('roflfaucet_global_stats', JSON.stringify(globalStats));
        this.loadGlobalStats();
    }
    
    // UI Methods (same as centralized version)
    
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
            this.switchModalTab('login');
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
        document.querySelectorAll('.modal-container .tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.modal-container .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
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
        
        const captchaSubmitBtn = document.getElementById('captcha-submit-btn');
        if (captchaSubmitBtn) {
            captchaSubmitBtn.addEventListener('click', () => this.processClaim());
        }
        
        // Show test captcha fallback
        const fallbackElement = document.getElementById('captcha-fallback');
        if (fallbackElement) {
            fallbackElement.style.display = 'block';
            
            const testCaptchaBtn = document.getElementById('simulate-captcha-btn');
            if (testCaptchaBtn) {
                testCaptchaBtn.addEventListener('click', () => {
                    console.log('Test captcha button clicked');
                    this.captchaToken = 'test_token_' + Date.now();
                    this.updateCaptchaSubmitButton();
                });
            }
        }
    }
    
    hideCaptchaSection() {
        const captchaSection = document.getElementById('captcha-section');
        const claimBtn = document.getElementById('claim-btn');
        
        if (captchaSection) captchaSection.style.display = 'none';
        if (claimBtn) claimBtn.style.display = 'block';
        
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
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay && this.userProfile) {
            usernameDisplay.textContent = this.userProfile.username;
        }
        
        const balanceDisplay = document.getElementById('balance-display');
        if (balanceDisplay) {
            balanceDisplay.textContent = this.userStats.balance || 0;
        }
        
        const claimsDisplay = document.getElementById('claims-display');
        if (claimsDisplay) {
            claimsDisplay.textContent = this.userStats.totalClaims || 0;
        }
        
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
    
    loadGlobalStats() {
        const globalStats = localStorage.getItem('roflfaucet_global_stats');
        if (globalStats) {
            const stats = JSON.parse(globalStats);
            this.updateGlobalStats(stats);
        } else {
            // Initialize with demo stats
            const demoStats = {
                totalUsers: 42,
                totalClaims: 156,
                totalTokensDistributed: 780
            };
            localStorage.setItem('roflfaucet_global_stats', JSON.stringify(demoStats));
            this.updateGlobalStats(demoStats);
        }
    }
    
    updateGlobalStats(stats) {
        const totalUsersEl = document.getElementById('total-users');
        const totalClaimsEl = document.getElementById('total-claims');
        const totalTokensEl = document.getElementById('total-tokens');
        
        if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers || 0;
        if (totalClaimsEl) totalClaimsEl.textContent = stats.totalClaims || 0;
        if (totalTokensEl) totalTokensEl.textContent = stats.totalTokensDistributed || 0;
    }
    
    startCountdown() {
        if (!this.userStats.nextClaimTime) return;
        
        const updateCountdown = () => {
            const now = new Date();
            const nextClaim = new Date(this.userStats.nextClaimTime);
            const timeLeft = nextClaim - now;
            
            if (timeLeft <= 0) {
                this.userStats.canClaim = true;
                this.userStats.nextClaimTime = null;
                this.saveUserStats();
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
        // Refresh stats every 30 seconds
        setInterval(() => {
            this.loadGlobalStats();
        }, 30 * 1000);
    }
    
    showMessage(message, type = 'info') {
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
        
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };
        
        messageEl.style.backgroundColor = colors[type] || colors.info;
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ROFLFaucet Simple...');
    window.roflfaucet = new ROFLFaucetSimple();
});

// Fallback initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.roflfaucet = new ROFLFaucetSimple();
    });
} else {
    window.roflfaucet = new ROFLFaucetSimple();
}

