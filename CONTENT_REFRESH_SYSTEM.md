# Content Refresh System - Simple Random Selection

*Page-load based content randomization with static lists*

## 🎯 **CORE PHILOSOPHY**

### Simple & Reliable
- **No complex algorithms** - just random selection from predefined lists
- **Page load refresh** - new content every time user visits/reloads
- **Static content lists** - no dependency on external APIs
- **Separate ad management** - ads never mixed with content
- **Multiple page loads** encouraged by faucet design

### Content Strategy
1. **Each slot gets random content** on page load
2. **Lists managed server-side** for easy updates
3. **No API dependencies** - all content pre-catalogued
4. **Fast loading** - immediate random selection
5. **Ad verification page** for network compliance

## 📋 **CONTENT LIST STRUCTURE**

### Video Content Lists
```javascript
// /src/content/videos.js
const VIDEO_LISTS = {
    youtube: [
        {
            id: 'dQw4w9WgXcQ',
            title: 'Funny Video 1',
            embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            description: 'Hilarious comedy clip'
        },
        {
            id: 'oHg5SJYRHA0',
            title: 'Funny Video 2', 
            embedUrl: 'https://www.youtube.com/embed/oHg5SJYRHA0',
            description: 'Another great laugh'
        },
        {
            id: 'iik25wqIuFo',
            title: 'Funny Video 3',
            embedUrl: 'https://www.youtube.com/embed/iik25wqIuFo',
            description: 'Comedy gold'
        }
        // Add 20-50 video IDs for good variety
    ],
    
    odysee: [
        {
            id: 'funny-clip-1',
            title: 'ROFL Clip 1',
            embedUrl: 'https://odysee.com/$/embed/funny-clip-1',
            channelUrl: 'https://odysee.com/@ROFLFaucet',
            description: 'Original funny content'
        },
        {
            id: 'funny-clip-2',
            title: 'ROFL Clip 2',
            embedUrl: 'https://odysee.com/$/embed/funny-clip-2',
            channelUrl: 'https://odysee.com/@ROFLFaucet',
            description: 'More laughs from our channel'
        }
        // Add your Odysee video list
    ]
};

module.exports = VIDEO_LISTS;
```

### Image Content Lists
```javascript
// /src/content/images.js
const IMAGE_LISTS = {
    giphy: [
        {
            id: '3oEjI6SIIHBdRxXI40',
            embedUrl: 'https://giphy.com/embed/3oEjI6SIIHBdRxXI40',
            directUrl: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
            sourceUrl: 'https://giphy.com/gifs/funny-laugh-3oEjI6SIIHBdRxXI40',
            description: 'Laughing character',
            category: 'celebration'
        },
        {
            id: 'ZqlvCTNHpqrio',
            embedUrl: 'https://giphy.com/embed/ZqlvCTNHpqrio',
            directUrl: 'https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif',
            sourceUrl: 'https://giphy.com/gifs/spongebob-laughing-ZqlvCTNHpqrio',
            description: 'SpongeBob laughing',
            category: 'character'
        }
        // Parse from your giphy01.txt and giphy02.txt files
    ],
    
    imgur: [
        {
            id: 'abc123',
            directUrl: 'https://i.imgur.com/abc123.gif',
            sourceUrl: 'https://imgur.com/abc123',
            description: 'Funny meme',
            category: 'meme'
        }
        // Parse from your imgur.txt file
    ],
    
    local: [
        {
            id: 'rofl-1',
            directUrl: '/assets/img/animations/funny-1.gif',
            sourceUrl: null, // No external source
            description: 'Original ROFL content',
            category: 'original'
        }
        // Scan from your ../img/ directories
    ],
    
    postimage: [
        {
            id: 'xyz789',
            directUrl: 'https://postimage.org/image/xyz789.png',
            sourceUrl: 'https://postimage.org/xyz789',
            description: 'Funny image',
            category: 'misc'
        }
        // Parse from your postimage.txt file
    ]
};

module.exports = IMAGE_LISTS;
```

## 🎲 **SIMPLE RANDOM SELECTION**

### Page Load Content Manager
```javascript
// /src/content/ContentManager.js
class SimpleContentManager {
    constructor() {
        this.videos = require('./videos');
        this.images = require('./images');
        this.platformWeights = {
            video: {
                odysee: 70, // Priority platform
                youtube: 30
            },
            image: {
                giphy: 40,
                imgur: 30, 
                local: 20,
                postimage: 10
            }
        };
    }
    
    // Called on every page load
    generatePageContent() {
        return {
            video: this.selectRandomVideo(),
            leftSidebar: this.generateSidebarContent('left'),
            rightSidebar: this.generateSidebarContent('right')
        };
    }
    
    selectRandomVideo() {
        const random = Math.random() * 100;
        
        if (random < this.platformWeights.video.odysee) {
            // Select random Odysee video
            const videos = this.videos.odysee;
            const randomIndex = Math.floor(Math.random() * videos.length);
            return {
                platform: 'odysee',
                ...videos[randomIndex],
                showChannelLink: true // Promote Odysee channel
            };
        } else {
            // Select random YouTube video
            const videos = this.videos.youtube;
            const randomIndex = Math.floor(Math.random() * videos.length);
            return {
                platform: 'youtube',
                ...videos[randomIndex],
                showChannelLink: false // Don't link to YouTube
            };
        }
    }
    
    generateSidebarContent(side) {
        const content = [];
        
        // Each sidebar gets 5-7 humor items (no ads here)
        const itemCount = 5 + Math.floor(Math.random() * 3); // 5-7 items
        
        for (let i = 0; i < itemCount; i++) {
            content.push(this.selectRandomImage());
        }
        
        return content;
    }
    
    selectRandomImage() {
        // Weighted random selection
        const weights = this.platformWeights.image;
        const random = Math.random() * 100;
        
        let platform;
        if (random < weights.giphy) {
            platform = 'giphy';
        } else if (random < weights.giphy + weights.imgur) {
            platform = 'imgur';
        } else if (random < weights.giphy + weights.imgur + weights.local) {
            platform = 'local';
        } else {
            platform = 'postimage';
        }
        
        const images = this.images[platform];
        const randomIndex = Math.floor(Math.random() * images.length);
        
        return {
            platform: platform,
            ...images[randomIndex]
        };
    }
}

module.exports = SimpleContentManager;
```

### Server-Side Implementation
```javascript
// /src/routes/index.js
const express = require('express');
const ContentManager = require('../content/ContentManager');
const router = express.Router();
const contentManager = new ContentManager();

// Main faucet page - generates new content every load
router.get('/', (req, res) => {
    const pageContent = contentManager.generatePageContent();
    
    res.render('index', {
        title: 'ROFLFaucet - Free Useless Tokens',
        video: pageContent.video,
        leftSidebar: pageContent.leftSidebar,
        rightSidebar: pageContent.rightSidebar,
        user: req.user || null
    });
});

// Force refresh endpoint for "Load New Content" buttons
router.get('/refresh-content', (req, res) => {
    const pageContent = contentManager.generatePageContent();
    res.json(pageContent);
});

module.exports = router;
```

## 📄 **MULTIPLE PAGE DESIGN**

### Faucet Navigation Structure
```javascript
// Different pages that encourage multiple page loads
const FAUCET_PAGES = {
    main: {
        route: '/',
        title: 'Claim Tokens',
        description: 'Get your free Useless Tokens'
    },
    achievements: {
        route: '/achievements',
        title: 'Your Achievements', 
        description: 'See your progress and milestones'
    },
    voting: {
        route: '/voting',
        title: 'Charity Voting',
        description: 'Vote on charity allocations'
    },
    leaderboard: {
        route: '/leaderboard',
        title: 'Token Leaderboard',
        description: 'See top token holders'
    },
    stats: {
        route: '/stats',
        title: 'Your Statistics',
        description: 'View your faucet statistics'
    },
    history: {
        route: '/history', 
        title: 'Claim History',
        description: 'Your token claim history'
    }
};

// Each page gets fresh random content
Object.keys(FAUCET_PAGES).forEach(pageKey => {
    const page = FAUCET_PAGES[pageKey];
    
    router.get(page.route, (req, res) => {
        const pageContent = contentManager.generatePageContent();
        
        res.render(pageKey, {
            title: `${page.title} - ROFLFaucet`,
            description: page.description,
            video: pageContent.video,
            leftSidebar: pageContent.leftSidebar,
            rightSidebar: pageContent.rightSidebar,
            user: req.user || null
        });
    });
});
```

### Navigation That Encourages Page Loads
```html
<!-- Main navigation - fresh content on every click -->
<nav class="faucet-nav">
    <div class="nav-items">
        <a href="/" class="nav-item">
            🎁 <span>Claim Tokens</span>
        </a>
        <a href="/achievements" class="nav-item">
            🏆 <span>Achievements</span>
        </a>
        <a href="/voting" class="nav-item">
            🗳️ <span>Vote</span>
        </a>
        <a href="/leaderboard" class="nav-item">
            📊 <span>Leaderboard</span>
        </a>
        <a href="/stats" class="nav-item">
            📈 <span>Statistics</span>
        </a>
        <a href="/history" class="nav-item">
            📋 <span>History</span>
        </a>
    </div>
    
    <div class="refresh-hint">
        <small>💡 Each page shows new funny content!</small>
    </div>
</nav>
```

## 🎯 **STATIC AD VERIFICATION PAGES**

### Ad Network Compliance Pages
```javascript
// /src/routes/ads.js
const express = require('express');
const router = express.Router();

// Static ad verification page for ad networks
router.get('/ads-test', (req, res) => {
    res.render('ads-verification', {
        title: 'Advertisement Verification - ROFLFaucet',
        layout: 'minimal' // No sidebar content, just ads
    });
});

// Individual ad slot verification
router.get('/ads-test/slot-:slotId', (req, res) => {
    const slotId = req.params.slotId;
    
    res.render('single-ad-verification', {
        title: `Ad Slot ${slotId} - ROFLFaucet`,
        slotId: slotId,
        layout: 'minimal'
    });
});

module.exports = router;
```

### Ad Verification Page Template
```html
<!-- views/ads-verification.ejs -->
<!DOCTYPE html>
<html>
<head>
    <title><%= title %></title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        .ad-container { margin: 20px 0; padding: 10px; border: 1px solid #ccc; }
        .ad-label { font-weight: bold; margin-bottom: 10px; }
        .page-info { background: #f5f5f5; padding: 10px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="page-info">
        <h1>ROFLFaucet - Advertisement Verification</h1>
        <p>This page displays our ad placements for network verification.</p>
        <p>Site: <a href="https://roflfaucet.com">https://roflfaucet.com</a></p>
    </div>
    
    <!-- Banner Ad -->
    <div class="ad-container">
        <div class="ad-label">Banner Advertisement (728x90)</div>
        <div id="banner-ad-slot">
            <!-- Banner ad code here -->
            <div style="width: 728px; height: 90px; background: #eee; display: flex; align-items: center; justify-content: center;">
                Banner Ad Placeholder
            </div>
        </div>
    </div>
    
    <!-- Sidebar Ads -->
    <div style="display: flex; gap: 20px;">
        <div class="ad-container">
            <div class="ad-label">Left Sidebar Ad (300x250)</div>
            <div id="left-ad-slot">
                <!-- Left sidebar ad code here -->
                <div style="width: 300px; height: 250px; background: #eee; display: flex; align-items: center; justify-content: center;">
                    Left Ad Placeholder
                </div>
            </div>
        </div>
        
        <div class="ad-container">
            <div class="ad-label">Right Sidebar Ad 1 (300x250)</div>
            <div id="right-ad-slot-1">
                <!-- Right sidebar ad 1 code here -->
                <div style="width: 300px; height: 250px; background: #eee; display: flex; align-items: center; justify-content: center;">
                    Right Ad 1 Placeholder
                </div>
            </div>
        </div>
        
        <div class="ad-container">
            <div class="ad-label">Right Sidebar Ad 2 (300x250)</div>
            <div id="right-ad-slot-2">
                <!-- Right sidebar ad 2 code here -->
                <div style="width: 300px; height: 250px; background: #eee; display: flex; align-items: center; justify-content: center;">
                    Right Ad 2 Placeholder
                </div>
            </div>
        </div>
    </div>
    
    <!-- Mobile Ad -->
    <div class="ad-container">
        <div class="ad-label">Mobile Advertisement (320x50)</div>
        <div id="mobile-ad-slot">
            <!-- Mobile ad code here -->
            <div style="width: 320px; height: 50px; background: #eee; display: flex; align-items: center; justify-content: center;">
                Mobile Ad Placeholder
            </div>
        </div>
    </div>
    
    <div class="page-info">
        <p><strong>Ad Network Verification Notes:</strong></p>
        <ul>
            <li>All ad slots are clearly labeled and separated</li>
            <li>No content mixed with advertisements</li>
            <li>Mobile-responsive ad placements</li>
            <li>Compliant with ad network policies</li>
        </ul>
        
        <p>Last updated: <%= new Date().toLocaleDateString() %></p>
    </div>
</body>
</html>
```

## 🔄 **CONTENT LIST MANAGEMENT**

### Automated Content List Updates
```javascript
// /scripts/update-content-lists.js
const fs = require('fs');
const path = require('path');

class ContentListUpdater {
    constructor() {
        this.contentDir = path.join(__dirname, '../content');
        this.sourceDir = path.join(__dirname, '../../..');
    }
    
    // Parse your existing text files into structured lists
    updateImageLists() {
        // Parse giphy01.txt
        const giphyContent = fs.readFileSync(
            path.join(this.sourceDir, 'giphy01.txt'), 
            'utf8'
        );
        
        const giphyList = this.parseGiphyFile(giphyContent);
        
        // Parse imgur.txt
        const imgurContent = fs.readFileSync(
            path.join(this.sourceDir, 'imgur.txt'), 
            'utf8'
        );
        
        const imgurList = this.parseImgurFile(imgurContent);
        
        // Scan local images
        const localList = this.scanLocalImages();
        
        // Update the images.js file
        const imageListsContent = `
        const IMAGE_LISTS = {
            giphy: ${JSON.stringify(giphyList, null, 4)},
            imgur: ${JSON.stringify(imgurList, null, 4)},
            local: ${JSON.stringify(localList, null, 4)},
            postimage: [] // Add manually as needed
        };
        
        module.exports = IMAGE_LISTS;
        `;
        
        fs.writeFileSync(
            path.join(this.contentDir, 'images.js'),
            imageListsContent
        );
        
        console.log('Image lists updated successfully!');
    }
    
    parseGiphyFile(content) {
        const iframeRegex = /<iframe[^>]*src="https:\/\/giphy\.com\/embed\/([^"]+)"[^>]*>.*?<!-- ([^-]*) -->/gs;
        const matches = [];
        let match;
        
        while ((match = iframeRegex.exec(content)) !== null) {
            const id = match[1];
            const description = match[2].trim();
            
            matches.push({
                id: id,
                embedUrl: `https://giphy.com/embed/${id}`,
                directUrl: `https://media.giphy.com/media/${id}/giphy.gif`,
                sourceUrl: `https://giphy.com/gifs/${id}`,
                description: description,
                category: 'humor'
            });
        }
        
        return matches;
    }
    
    parseImgurFile(content) {
        // Parse imgur.txt based on its format
        const lines = content.split('\n').filter(line => line.trim());
        
        return lines.map((line, index) => {
            // Adjust parsing based on your imgur.txt format
            const url = line.trim();
            const id = url.split('/').pop().split('.')[0];
            
            return {
                id: id,
                directUrl: url,
                sourceUrl: `https://imgur.com/${id}`,
                description: `Funny image ${index + 1}`,
                category: 'humor'
            };
        });
    }
    
    scanLocalImages() {
        const imgDir = path.join(this.sourceDir, 'img');
        const images = [];
        
        // Recursively scan image directories
        function scanDir(dir, basePath = '') {
            const items = fs.readdirSync(dir);
            
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDir(fullPath, path.join(basePath, item));
                } else if (/\.(gif|jpg|jpeg|png)$/i.test(item)) {
                    const relativePath = path.join(basePath, item);
                    images.push({
                        id: item.split('.')[0],
                        directUrl: `/assets/img/${relativePath}`,
                        sourceUrl: null,
                        description: `Local image: ${item}`,
                        category: 'original'
                    });
                }
            });
        }
        
        if (fs.existsSync(imgDir)) {
            scanDir(imgDir);
        }
        
        return images;
    }
}

// Run the updater
const updater = new ContentListUpdater();
updater.updateImageLists();
```

## 🎮 **"Load New Content" Feature**

### Client-Side Content Refresh
```javascript
// /public/js/content-refresh.js
class PageContentRefresh {
    constructor() {
        this.setupRefreshButtons();
    }
    
    setupRefreshButtons() {
        // "Load New Video" button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('new-video-btn')) {
                this.refreshVideo();
            }
            
            if (e.target.classList.contains('new-images-btn')) {
                this.refreshImages();
            }
            
            if (e.target.classList.contains('refresh-page-btn')) {
                this.refreshEntirePage();
            }
        });
    }
    
    async refreshVideo() {
        try {
            const response = await fetch('/refresh-content');
            const content = await response.json();
            
            // Update video embed
            const videoContainer = document.getElementById('video-embed');
            videoContainer.src = content.video.embedUrl;
            
            // Update video info
            const videoTitle = document.querySelector('.video-title');
            if (videoTitle) videoTitle.textContent = content.video.title;
            
            // Show/hide Odysee promotion
            const odyseePromo = document.getElementById('odysee-promotion');
            if (odyseePromo) {
                odyseePromo.style.display = content.video.showChannelLink ? 'block' : 'none';
            }
            
        } catch (error) {
            console.error('Failed to refresh video:', error);
        }
    }
    
    async refreshImages() {
        try {
            const response = await fetch('/refresh-content');
            const content = await response.json();
            
            // Update sidebar images
            this.updateSidebarImages('left-sidebar', content.leftSidebar);
            this.updateSidebarImages('right-sidebar', content.rightSidebar);
            
        } catch (error) {
            console.error('Failed to refresh images:', error);
        }
    }
    
    updateSidebarImages(sidebarId, images) {
        const sidebar = document.getElementById(sidebarId);
        const humorItems = sidebar.querySelectorAll('.humor-item');
        
        images.forEach((image, index) => {
            if (humorItems[index]) {
                const img = humorItems[index].querySelector('img');
                const link = humorItems[index].querySelector('.view-source-btn');
                
                if (img) img.src = image.directUrl;
                if (link && image.sourceUrl) {
                    link.onclick = () => openSource(image.sourceUrl, image.platform, image.id);
                }
            }
        });
    }
    
    refreshEntirePage() {
        // Simple page reload for fresh content
        window.location.reload();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new PageContentRefresh();
});
```

This system provides simple, reliable content refresh with no external API dependencies. Each page load gives users fresh content, encouraging exploration while building your external platform audiences!

