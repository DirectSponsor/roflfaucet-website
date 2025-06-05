// ROFLFaucet JavaScript - Working Version
console.log('ROFLFaucet script loading...');

class ROFLFaucet {
    constructor() {
        this.apiBase = window.location.origin;
        this.userId = localStorage.getItem('roflfaucet_userId');
        this.username = localStorage.getItem('roflfaucet_username');
        this.userStats = {
            balance: 0,
            totalClaims: 0,
            canClaim: true,
            nextClaimTime: null
        };
        
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
            claimBtn.addEventListener('click', () => this.handleClaim());
            console.log('Claim button found and connected');
        }
        
        // Refresh stats button
        const refreshBtn = document.getElementById('refresh-stats');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadGlobalStats());
        }
    }

    // Check if user has existing session
    async checkUserSession() {
        console.log('Checking user session...');
        if (this.userId && this.username) {
            console.log('Found existing user:', this.username);
            await this.loadUserStats();
            this.showUserInterface();
        } else {
            console.log('No existing user, showing signup');
            this.showSignupInterface();
        }
    }

    // Handle user signup
    async handleSignup() {
        const usernameInput = document.getElementById('username-input');
        const username = usernameInput?.value?.trim();
        
        console.log('Attempting signup with username:', username);
        
        if (!username) {
            this.showMessage('Please enter a username', 'error');
            return;
        }
        
        if (username.length < 3) {
            this.showMessage('Username must be at least 3 characters', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/api/user/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });
            
            const data = await response.json();
            console.log('Signup response:', data);
            
            if (response.ok) {
                this.userId = data.userId;
                this.username = data.username;
                
                // Save to localStorage
                localStorage.setItem('roflfaucet_userId', this.userId);
                localStorage.setItem('roflfaucet_username', this.username);
                
                this.userStats = {
                    balance: data.balance,
                    totalClaims: data.totalClaims,
                    canClaim: data.canClaim,
                    nextClaimTime: null
                };
                
                this.showUserInterface();
                this.showMessage(`Welcome, ${this.username}! You can claim your first tokens now.`, 'success');
                
                // Update global stats
                this.loadGlobalStats();
            } else {
                this.showMessage(data.error || 'Failed to create user', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showMessage('Connection error. Please try again.', 'error');
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

    // Handle token claim
    async handleClaim() {
        if (!this.userId) {
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
        
        const claimBtn = document.getElementById('claim-btn');
        const originalText = claimBtn?.textContent;
        
        try {
            if (claimBtn) {
                claimBtn.disabled = true;
                claimBtn.textContent = 'Claiming...';
            }
            
            const response = await fetch(`${this.apiBase}/api/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: this.userId })
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
                
                // Update global stats
                this.loadGlobalStats();
            } else {
                this.showMessage(data.error || 'Claim failed', 'error');
            }
        } catch (error) {
            console.error('Claim error:', error);
            this.showMessage('Connection error. Please try again.', 'error');
        } finally {
            if (claimBtn) {
                claimBtn.disabled = false;
                claimBtn.textContent = originalText;
            }
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
        if (claimBtn) {
            claimBtn.disabled = !this.userStats.canClaim;
            claimBtn.textContent = this.userStats.canClaim ? '🎲 Claim UselessCoins!' : 'Cooldown Active';
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

// Initialize the faucet when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ROFLFaucet...');
    try {
        window.roflfaucet = new ROFLFaucet();
        console.log('ROFLFaucet initialized successfully!');
    } catch (error) {
        console.error('Failed to initialize ROFLFaucet:', error);
    }
});

