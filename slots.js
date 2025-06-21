// =======================================
// CASINO SLOT MACHINE GAME ENGINE
// =======================================

class CasinoSlotMachine {
    constructor() {
        // Game State
        this.isSpinning = false;
        this.currentBet = 1;
        this.userLevel = 1;
        this.credits = 0;
        this.lastWin = 0;
        
        // Statistics
        this.totalSpins = 0;
        this.totalWagered = 0;
        this.totalWon = 0;
        
        // Big Win Pool (Andy's system)
        this.bigWinPool = 0;
        this.bigWinThreshold = 1000; // "4 figures to look big"
        
        // Symbol definitions (matching casino images)
        this.symbols = [
            { emoji: '🍒', name: 'cherry', value: 2, weight: 40 },      // Most common
            { emoji: '🍌', name: 'banana', value: 3, weight: 30 },
            { emoji: '🍉', name: 'watermelon', value: 5, weight: 20 },
            { emoji: '🔴', name: 'seven', value: 10, weight: 8 },       // Lucky 7
            { emoji: '📊', name: 'bar', value: 15, weight: 2 }          // BAR symbol
        ];
        
        // Level system (Andy's progression economics)
        this.levels = {
            1: { cost: 0, multiplier: 1.0, maxBet: 1 },
            2: { cost: 50, multiplier: 1.2, maxBet: 2 },
            3: { cost: 150, multiplier: 1.5, maxBet: 3 },
            4: { cost: 300, multiplier: 1.8, maxBet: 4 },
            5: { cost: 500, multiplier: 2.0, maxBet: 5 }
        };
        
        this.initializeGame();
    }
    
    initializeGame() {
        this.loadUserData();
        this.setupEventListeners();
        this.updateDisplay();
        this.populateReels();
        console.log('🎰 Casino Slot Machine initialized!');
    }
    
    loadUserData() {
        // Load from your existing OAuth/balance system
        // For now, using localStorage for demo
        const saved = localStorage.getItem('slotMachineData');
        if (saved) {
            const data = JSON.parse(saved);
            this.credits = data.credits || 0;
            this.userLevel = data.userLevel || 1;
            this.totalSpins = data.totalSpins || 0;
            this.totalWagered = data.totalWagered || 0;
            this.totalWon = data.totalWon || 0;
            this.bigWinPool = data.bigWinPool || 0;
        } else {
            // New user gets starting credits
            this.credits = 100;
        }
    }
    
    saveUserData() {
        const data = {
            credits: this.credits,
            userLevel: this.userLevel,
            totalSpins: this.totalSpins,
            totalWagered: this.totalWagered,
            totalWon: this.totalWon,
            bigWinPool: this.bigWinPool
        };
        localStorage.setItem('slotMachineData', JSON.stringify(data));
    }
    
    setupEventListeners() {
        // Make functions globally accessible
        window.spinReels = () => this.spin();
        window.increaseBet = () => this.adjustBet(1);
        window.decreaseBet = () => this.adjustBet(-1);
        window.claimWinnings = () => this.claimWinnings();
    }
    
    populateReels() {
        for (let i = 1; i <= 3; i++) {
            const reel = document.getElementById(`reel${i}`);
            reel.innerHTML = '';
            
            // Create symbols container for smooth scrolling
            const symbolsContainer = document.createElement('div');
            symbolsContainer.className = 'symbols-container';
            
            // Create many symbols for continuous spinning effect
            // Need enough symbols to cover the animation distance
            for (let j = 0; j < 15; j++) {
                const symbol = this.getRandomSymbol();
                const symbolDiv = document.createElement('div');
                symbolDiv.className = 'symbol';
                symbolDiv.textContent = symbol.emoji;
                symbolDiv.dataset.name = symbol.name;
                symbolDiv.dataset.value = symbol.value;
                symbolsContainer.appendChild(symbolDiv);
            }
            
            reel.appendChild(symbolsContainer);
        }
    }
    
    getRandomSymbol() {
        const totalWeight = this.symbols.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const symbol of this.symbols) {
            random -= symbol.weight;
            if (random <= 0) {
                return symbol;
            }
        }
        return this.symbols[0]; // Fallback
    }
    
    async spin() {
        if (this.isSpinning || this.credits < this.currentBet) {
            return;
        }
        
        this.isSpinning = true;
        this.credits -= this.currentBet;
        this.totalSpins++;
        this.totalWagered += this.currentBet;
        
        // Add to big win pool (Andy's system)
        this.bigWinPool += this.currentBet * 0.1; // 10% goes to big win pool
        
        this.updateDisplay();
        this.disableControls();
        
        // Start reel animations
        this.startReelSpinning();
        
        // Determine win result BEFORE stopping (fair but feels authentic)
        const result = this.calculateWinResult();
        
        // Stop reels with staggered timing (like real slots)
        await this.stopReelsSequentially(result);
        
        // Process win
        if (result.isWin) {
            await this.showWinAnimation(result);
        }
        
        this.isSpinning = false;
        this.enableControls();
        this.saveUserData();
    }
    
    startReelSpinning() {
        for (let i = 1; i <= 3; i++) {
            const reel = document.getElementById(`reel${i}`);
            reel.classList.remove('stopping', 'bounce', 'spinning');
            reel.classList.add('accelerating');
            
            // Transition to full speed after acceleration
            setTimeout(() => {
                reel.classList.remove('accelerating');
                reel.classList.add('spinning');
            }, 800); // Match acceleration duration
        }
        
        document.getElementById('spin-btn').classList.add('spinning');
    }
    
    async stopReelsSequentially(result) {
        // Wait for acceleration to complete before starting to stop reels
        const baseDelay = 800; // Wait for acceleration
        const delays = [baseDelay + 400, baseDelay + 800, baseDelay + 1200]; // Staggered stopping
        
        for (let i = 0; i < 3; i++) {
            await new Promise(resolve => {
                setTimeout(() => {
                    this.stopReel(i + 1, result.symbols[i]);
                    resolve();
                }, delays[i]);
            });
        }
        
        // Wait for all animations to complete before removing spinning state
        setTimeout(() => {
            document.getElementById('spin-btn').classList.remove('spinning');
        }, 500);
    }
    
    stopReel(reelNumber, targetSymbol) {
        const reel = document.getElementById(`reel${reelNumber}`);
        reel.classList.remove('spinning', 'accelerating');
        reel.classList.add('stopping');
        
        // Set the target symbol in the visible middle position
        const symbolsContainer = reel.querySelector('.symbols-container');
        const symbols = symbolsContainer.querySelectorAll('.symbol');
        
        // Find a good position to place our target symbol (around middle of visible area)
        const targetIndex = Math.floor(symbols.length / 2) + 1; // Middle of the symbol strip
        if (symbols[targetIndex]) {
            symbols[targetIndex].textContent = targetSymbol.emoji;
            symbols[targetIndex].dataset.name = targetSymbol.name;
            symbols[targetIndex].dataset.value = targetSymbol.value;
        }
        
        // Add bounce effect after stopping animation completes
        setTimeout(() => {
            reel.classList.remove('stopping');
            reel.classList.add('bounce');
            
            setTimeout(() => {
                reel.classList.remove('bounce');
            }, 600);
        }, 1200); // Wait for stopping animation to complete
    }
    
    calculateWinResult() {
        // Andy's "no net loss" system - users always gain over time
        const baseReward = this.currentBet * 0.6; // 60% return minimum
        const levelMultiplier = this.levels[this.userLevel].multiplier;
        
        // Check for big win opportunity
        const shouldGiveBigWin = this.shouldTriggerBigWin();
        
        if (shouldGiveBigWin) {
            return this.createBigWin();
        }
        
        // Regular win calculation
        const winChance = 0.7; // 70% win rate (Andy's "no net loss")
        const isWin = Math.random() < winChance;
        
        if (isWin) {
            // Create matching symbols
            const winSymbol = this.getRandomSymbol();
            const symbols = [winSymbol, winSymbol, winSymbol];
            const winAmount = Math.floor(baseReward * winSymbol.value * levelMultiplier);
            
            return {
                isWin: true,
                isBigWin: false,
                symbols: symbols,
                winAmount: winAmount
            };
        } else {
            // Even on \"loss\", give small consolation (no net loss principle)
            const symbols = [this.getRandomSymbol(), this.getRandomSymbol(), this.getRandomSymbol()];
            const consolation = Math.floor(baseReward * 0.3);
            
            return {
                isWin: false,
                isBigWin: false,
                symbols: symbols,
                winAmount: consolation
            };
        }
    }
    
    shouldTriggerBigWin() {
        // Andy's big win algorithm
        const poolThreshold = this.bigWinThreshold;
        const timeBonus = this.totalSpins > 10; // Engagement reward
        const randomChance = Math.random() < 0.02; // 2% chance
        
        return this.bigWinPool >= poolThreshold && timeBonus && randomChance;
    }
    
    createBigWin() {
        const bigWinAmount = Math.floor(this.bigWinPool * 0.8); // Use 80% of pool
        this.bigWinPool *= 0.2; // Keep 20% for next big win
        
        // Create special big win symbols
        const bigWinSymbol = { emoji: '💎', name: 'bigwin', value: 50 };
        const symbols = [bigWinSymbol, bigWinSymbol, bigWinSymbol];
        
        return {
            isWin: true,
            isBigWin: true,
            symbols: symbols,
            winAmount: bigWinAmount
        };
    }
    
    async showWinAnimation(result) {
        if (result.isBigWin) {
            // Big win celebration
            const overlay = document.getElementById('win-overlay');
            const amountEl = document.getElementById('win-amount');
            
            amountEl.textContent = `${result.winAmount} Credits!`;
            overlay.classList.add('show');
            
            // Highlight winning symbols
            this.highlightWinningSymbols();
            
            // Wait for animation
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            overlay.classList.remove('show');
        } else if (result.isWin) {
            // Regular win highlight
            this.highlightWinningSymbols();
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // Add winnings and enable claim
        this.credits += result.winAmount;
        this.lastWin = result.winAmount;
        this.totalWon += result.winAmount;
        
        if (result.winAmount > 0) {
            this.enableClaimButton();
        }
        
        this.updateDisplay();
    }
    
    highlightWinningSymbols() {
        for (let i = 1; i <= 3; i++) {
            const reel = document.getElementById(`reel${i}`);
            const symbolsContainer = reel.querySelector('.symbols-container');
            const symbols = symbolsContainer.querySelectorAll('.symbol');
            
            // Find the symbol that should be in the middle of the visible area
            const targetIndex = Math.floor(symbols.length / 2) + 1;
            const middleSymbol = symbols[targetIndex];
            
            if (middleSymbol) {
                middleSymbol.classList.add('winning');
                
                setTimeout(() => {
                    middleSymbol.classList.remove('winning');
                }, 2000);
            }
        }
    }
    
    enableClaimButton() {
        const claimBtn = document.getElementById('claim-btn');
        claimBtn.disabled = false;
        claimBtn.classList.add('pulsing');
    }
    
    claimWinnings() {
        // Integration point with your existing balance API
        if (this.lastWin > 0) {
            // Here you would call your existing claimTokens() function
            console.log(`🎰 Claiming ${this.lastWin} credits from slot machine!`);
            
            // For now, just disable the button
            const claimBtn = document.getElementById('claim-btn');
            claimBtn.disabled = true;
            claimBtn.classList.remove('pulsing');
            claimBtn.textContent = 'Credits Claimed!';
            
            setTimeout(() => {
                claimBtn.textContent = 'Click to claim Free Credits!';
            }, 2000);
            
            this.lastWin = 0;
            this.updateDisplay();
        }
    }
    
    adjustBet(change) {
        const maxBet = this.levels[this.userLevel].maxBet;
        const newBet = this.currentBet + change;
        
        if (newBet >= 1 && newBet <= maxBet && newBet <= this.credits) {
            this.currentBet = newBet;
            this.updateDisplay();
        }
    }
    
    disableControls() {
        document.getElementById('spin-btn').disabled = true;
        document.querySelectorAll('.bet-btn').forEach(btn => btn.disabled = true);
    }
    
    enableControls() {
        document.getElementById('spin-btn').disabled = false;
        document.querySelectorAll('.bet-btn').forEach(btn => btn.disabled = false);
    }
    
    updateDisplay() {
        // Update stats bar
        document.getElementById('total-spins').textContent = this.totalSpins.toLocaleString();
        document.getElementById('total-wagered').textContent = this.totalWagered.toLocaleString();
        document.getElementById('total-won').textContent = this.totalWon.toLocaleString();
        
        // Update control panel
        document.getElementById('last-win').textContent = this.lastWin;
        document.getElementById('current-balance').textContent = this.credits;
        document.getElementById('current-bet').textContent = this.currentBet;
        
        // Update spin button state
        const spinBtn = document.getElementById('spin-btn');
        spinBtn.disabled = this.credits < this.currentBet || this.isSpinning;
    }
}

// Initialize the slot machine when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.slotMachine = new CasinoSlotMachine();
});

