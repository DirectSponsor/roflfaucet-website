// Simple ROFLFaucet - Clean Implementation
console.log('🚰 Simple ROFLFaucet loading...');

class SimpleFaucet {
    constructor() {
        // Basic settings
        this.claimAmount = 5; // UselessCoins per claim
        this.cooldownSeconds = 60; // 60 seconds for testing
        
        // User state
        this.isLoggedIn = false;
        this.username = '';
        this.balance = 0;
        this.totalClaims = 0;
        this.lastClaimTime = null;
        this.cooldownTimer = null;
        
        console.log('🔧 SimpleFaucet initialized');
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkLoginState();
        this.updateUI();
    }
    
    setupEventListeners() {
        // Login button
        const loginBtn = document.getElementById('simple-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }
        
        // Claim button
        const claimBtn = document.getElementById('simple-claim-btn');
        if (claimBtn) {
            claimBtn.addEventListener('click', () => this.handleClaim());
        }
        
        // Logout button
        const logoutBtn = document.getElementById('simple-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }
    
    checkLoginState() {
        // Check localStorage for user data
        const savedUser = localStorage.getItem('simple_faucet_user');
        if (savedUser) {
            const userData = JSON.parse(savedUser);
            this.isLoggedIn = true;
            this.username = userData.username;
            this.balance = userData.balance || 0;
            this.totalClaims = userData.totalClaims || 0;
            this.lastClaimTime = userData.lastClaimTime ? new Date(userData.lastClaimTime) : null;
            
            console.log('✅ User data loaded:', userData);
        }
    }
    
    saveUserData() {
        const userData = {
            username: this.username,
            balance: this.balance,
            totalClaims: this.totalClaims,
            lastClaimTime: this.lastClaimTime ? this.lastClaimTime.toISOString() : null
        };
        localStorage.setItem('simple_faucet_user', JSON.stringify(userData));
        console.log('💾 User data saved:', userData);
    }
    
    handleLogin() {
        const username = prompt('Enter username for testing:');
        if (username && username.trim()) {
            this.isLoggedIn = true;
            this.username = username.trim();
            this.balance = 0;
            this.totalClaims = 0;
            this.lastClaimTime = null;
            
            this.saveUserData();
            this.updateUI();
            this.showMessage(`Welcome, ${this.username}!`, 'success');
        }
    }
    
    handleLogout() {
        this.isLoggedIn = false;
        this.username = '';
        this.balance = 0;
        this.totalClaims = 0;
        this.lastClaimTime = null;
        
        localStorage.removeItem('simple_faucet_user');
        this.updateUI();
        this.showMessage('Logged out successfully', 'info');
    }
    
    canClaim() {
        if (!this.lastClaimTime) return true;
        
        const now = new Date();
        const timeDiff = now - this.lastClaimTime;
        return timeDiff >= (this.cooldownSeconds * 1000);
    }
    
    getTimeUntilNextClaim() {
        if (!this.lastClaimTime) return 0;
        
        const now = new Date();
        const timeDiff = now - this.lastClaimTime;
        const cooldownMs = this.cooldownSeconds * 1000;
        
        return Math.max(0, cooldownMs - timeDiff);
    }
    
    handleClaim() {
        if (!this.isLoggedIn) {
            this.showMessage('Please login first!', 'error');
            return;
        }
        
        if (!this.canClaim()) {
            const timeLeft = Math.ceil(this.getTimeUntilNextClaim() / 1000);
            this.showMessage(`Please wait ${timeLeft} seconds before claiming again`, 'warning');
            return;
        }
        
        // Process the claim
        this.balance += this.claimAmount;
        this.totalClaims += 1;
        this.lastClaimTime = new Date();
        
        this.saveUserData();
        this.updateUI();
        this.showMessage(`🎉 Claimed ${this.claimAmount} UselessCoins!`, 'success');
        
        console.log('✅ Claim successful:', {
            amount: this.claimAmount,
            newBalance: this.balance,
            totalClaims: this.totalClaims
        });
    }
    
    updateUI() {
        // Show/hide sections based on login state
        const loginSection = document.getElementById('simple-login-section');
        const faucetSection = document.getElementById('simple-faucet-section');
        
        if (this.isLoggedIn) {
            if (loginSection) loginSection.style.display = 'none';
            if (faucetSection) faucetSection.style.display = 'block';
        } else {
            if (loginSection) loginSection.style.display = 'block';
            if (faucetSection) faucetSection.style.display = 'none';
        }
        
        // Update user info
        const usernameEl = document.getElementById('simple-username');
        if (usernameEl) usernameEl.textContent = this.username;
        
        const balanceEl = document.getElementById('simple-balance');
        if (balanceEl) balanceEl.textContent = this.balance;
        
        const claimsEl = document.getElementById('simple-claims');
        if (claimsEl) claimsEl.textContent = this.totalClaims;
        
        // Update claim button
        this.updateClaimButton();
        
        // Start countdown if needed
        this.startCountdown();
    }
    
    updateClaimButton() {
        const claimBtn = document.getElementById('simple-claim-btn');
        if (!claimBtn) return;
        
        const canClaim = this.canClaim();
        claimBtn.disabled = !canClaim;
        
        if (canClaim) {
            claimBtn.textContent = `🎲 Claim ${this.claimAmount} UselessCoins`;
            claimBtn.className = 'claim-btn enabled';
        } else {
            const timeLeft = Math.ceil(this.getTimeUntilNextClaim() / 1000);
            claimBtn.textContent = `⏱️ Wait ${timeLeft}s`;
            claimBtn.className = 'claim-btn disabled';
        }
        
        console.log('🔄 Button updated:', { canClaim, disabled: claimBtn.disabled });
    }
    
    startCountdown() {
        // Clear existing timer
        if (this.cooldownTimer) {
            clearInterval(this.cooldownTimer);
        }
        
        if (this.canClaim()) return;
        
        this.cooldownTimer = setInterval(() => {
            if (this.canClaim()) {
                clearInterval(this.cooldownTimer);
                this.updateClaimButton();
            } else {
                this.updateClaimButton();
            }
        }, 1000);
    }
    
    showMessage(text, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${text}`);
        
        const messageEl = document.getElementById('simple-message');
        if (messageEl) {
            messageEl.textContent = text;
            messageEl.className = `message ${type}`;
            messageEl.style.display = 'block';
            
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 3000);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM loaded, initializing SimpleFaucet...');
    window.simpleFaucet = new SimpleFaucet();
    console.log('✅ SimpleFaucet ready!');
});

