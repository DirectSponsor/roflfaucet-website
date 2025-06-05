// Automatic Image Discovery and Management System
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');

class AutoImageManager {
    constructor() {
        this.imageConfig = {
            giphy: {
                galleries: [
                    'https://giphy.com/search/funny',
                    'https://giphy.com/search/animals',
                    'https://giphy.com/search/memes',
                    'https://giphy.com/search/cats',
                    'https://giphy.com/search/dogs'
                ],
                weight: 70 // 70% of images from Giphy
            },
            imgur: {
                galleries: [
                    'https://imgur.com/r/funny',
                    'https://imgur.com/r/aww',
                    'https://imgur.com/r/memes'
                ],
                weight: 20 // 20% from Imgur
            },
            local: {
                sources: [
                    '../../giphy01.txt',    // Existing Giphy collection ✅
                    '../../giphy02.txt',    // More funny GIFs ✅
                    '../../imgur01.txt',    // Andy's Imgur uploads/favorites
                    '../../misc01.txt'      // Other sites (9gag, reddit, etc.)
                ],
                weight: 70 // 70% from Andy's curated content (Phase 1)
            },
            ads: {
                sources: [
                    '../../ads01.txt',      // Direct advertisers (Andy's clients) 
                    '../../affiliates.txt', // Affiliate links with images
                    '../../network.txt'     // Network ads (rotating banners)
                ],
                weight: 30 // 30% ad content (Phase 2 - coming soon)
            }
        };
        
        this.imageCache = {
            giphy: [],
            imgur: [],
            local: [],
            ads: [],
            lastUpdated: {
                giphy: null,
                imgur: null,
                local: null,
                ads: null
            }
        };
        
        this.cacheFile = path.join(__dirname, '../data/image-cache.json');
        this.updateInterval = 4 * 60 * 60 * 1000; // 4 hours (more frequent than videos)
        
        this.init();
    }
    
    async init() {
        await this.loadCachedImages();
        this.startPeriodicUpdates();
    }
    
    // Load cached images from file
    async loadCachedImages() {
        try {
            const data = await fs.readFile(this.cacheFile, 'utf8');
            this.imageCache = JSON.parse(data);
            console.log('🖼️  Image cache loaded from file');
        } catch (error) {
            console.log('🖼️  No existing image cache, creating initial cache...');
            await this.updateAllImages();
        }
    }
    
    // Save image cache to file
    async saveCachedImages() {
        try {
            await fs.mkdir(path.dirname(this.cacheFile), { recursive: true });
            await fs.writeFile(this.cacheFile, JSON.stringify(this.imageCache, null, 2));
            console.log('🖼️  Image cache saved successfully');
        } catch (error) {
            console.error('❌ Error saving image cache:', error.message);
        }
    }
    
    // Load Andy's curated content files (4 sources)
    async updateLocalImages() {
        try {
            console.log('📁 Loading Andy\'s curated content files...');
            const images = [];
            
            for (const sourceFile of this.imageConfig.local.sources) {
                try {
                    const filePath = path.resolve(__dirname, sourceFile);
                    const content = await fs.readFile(filePath, 'utf8');
                    
                    // Extract Giphy embed URLs
                    const embedMatches = content.match(/src="https:\/\/giphy\.com\/embed\/([^"]+)"/g) || [];
                    
                    embedMatches.forEach((match, index) => {
                        const embedUrl = match.replace('src="', '').replace('"', '');
                        const embedParts = embedUrl.split('/embed/');
                        const giphyId = embedParts.length > 1 ? embedParts[1].split('?')[0] : null;
                        
                        if (giphyId) {
                            images.push({
                                id: `local-${giphyId}`,
                                type: 'giphy',
                                embedUrl: embedUrl,
                                directUrl: `https://i.giphy.com/media/${giphyId}/giphy.gif`,
                                thumbnail: `https://i.giphy.com/media/${giphyId}/200w.gif`,
                                title: `Funny GIF ${images.length + 1}`,
                                platform: 'local',
                                source: path.basename(sourceFile)
                            });
                        }
                    });
                } catch (fileError) {
                    console.log(`⚠️  Could not read ${sourceFile}:`, fileError.message);
                    console.log(`💡 Create this file when you have content for it!`);
                }
            }
            
            this.imageCache.local = images;
            this.imageCache.lastUpdated.local = new Date().toISOString();
            console.log(`✅ Found ${images.length} local images`);
            
        } catch (error) {
            console.error('❌ Error updating local images:', error.message);
            if (this.imageCache.local.length === 0) {
                this.imageCache.local = this.createLocalPlaceholders();
            }
        }
    }
    
    // Scrape Giphy galleries
    async updateGiphyImages() {
        try {
            console.log('🔍 Discovering Giphy images from galleries...');
            const images = [];
            
            // For now, use trending API (Giphy gallery scraping is complex due to dynamic loading)
            try {
                const response = await axios.get('https://api.giphy.com/v1/gifs/trending', {
                    params: {
                        api_key: process.env.GIPHY_API_KEY || 'dc6zaTOxFJmzC', // Public beta key
                        limit: 25,
                        rating: 'g'
                    },
                    timeout: 10000
                });
                
                if (response.data && response.data.data) {
                    response.data.data.forEach(gif => {
                        images.push({
                            id: `giphy-${gif.id}`,
                            type: 'giphy',
                            embedUrl: `https://giphy.com/embed/${gif.id}`,
                            directUrl: gif.images.original.url,
                            thumbnail: gif.images.fixed_width_small.url,
                            title: gif.title || 'Funny GIF',
                            platform: 'giphy',
                            tags: gif.tags || [],
                            rating: gif.rating
                        });
                    });
                }
            } catch (apiError) {
                console.log('⚠️  Giphy API failed, using local fallback');
                // Fallback to local files if API fails
                await this.updateLocalImages();
                return;
            }
            
            this.imageCache.giphy = images;
            this.imageCache.lastUpdated.giphy = new Date().toISOString();
            console.log(`✅ Found ${images.length} Giphy images`);
            
        } catch (error) {
            console.error('❌ Error updating Giphy images:', error.message);
            if (this.imageCache.giphy.length === 0) {
                this.imageCache.giphy = this.createGiphyPlaceholders();
            }
        }
    }
    
    // Load ad content (Phase 2 - coming soon)
    async updateAdContent() {
        try {
            console.log('📢 Loading ad content (Phase 2 prep)...');
            const ads = [];
            
            // Phase 2: Will read ad files when Andy creates them
            for (const sourceFile of this.imageConfig.ads.sources) {
                try {
                    const filePath = path.resolve(__dirname, sourceFile);
                    const content = await fs.readFile(filePath, 'utf8');
                    
                    // Parse HTML ad blocks
                    const adBlocks = content.match(/<div class="ad-block"[\s\S]*?<\/div>/g) || [];
                    
                    adBlocks.forEach((block, index) => {
                        ads.push({
                            id: `ad-${sourceFile}-${index}`,
                            type: 'ad',
                            htmlContent: block,
                            title: `Advertisement ${ads.length + 1}`,
                            platform: 'ads',
                            source: path.basename(sourceFile)
                        });
                    });
                } catch (fileError) {
                    console.log(`💡 ${sourceFile} not ready yet - Phase 2 feature`);
                }
            }
            
            this.imageCache.ads = ads;
            this.imageCache.lastUpdated.ads = new Date().toISOString();
            console.log(`✅ Found ${ads.length} ad items (Phase 2 prep)`);
            
        } catch (error) {
            console.error('❌ Error updating ad content:', error.message);
            this.imageCache.ads = [];
        }
    }
    
    // Scrape Imgur galleries (simplified approach)
    async updateImgurImages() {
        try {
            console.log('🔍 Discovering Imgur images...');
            const images = [];
            
            // Note: Imgur requires more complex scraping due to their API changes
            // For now, create some placeholder content
            console.log('📝 Imgur scraping coming soon - using placeholders for now');
            
            this.imageCache.imgur = this.createImgurPlaceholders();
            this.imageCache.lastUpdated.imgur = new Date().toISOString();
            console.log(`✅ Found ${this.imageCache.imgur.length} Imgur placeholders`);
            
        } catch (error) {
            console.error('❌ Error updating Imgur images:', error.message);
            if (this.imageCache.imgur.length === 0) {
                this.imageCache.imgur = this.createImgurPlaceholders();
            }
        }
    }
    
    // Create placeholder images
    createLocalPlaceholders() {
        return [
            {
                id: 'placeholder-local-1',
                type: 'giphy',
                embedUrl: 'https://giphy.com/embed/3oEjHAUOqG3lSS0f1C',
                directUrl: 'https://i.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif',
                thumbnail: 'https://i.giphy.com/media/3oEjHAUOqG3lSS0f1C/200w.gif',
                title: 'Muttley Laughing',
                platform: 'local',
                isPlaceholder: true
            }
        ];
    }
    
    createGiphyPlaceholders() {
        return [
            {
                id: 'placeholder-giphy-1',
                type: 'giphy',
                embedUrl: 'https://giphy.com/embed/T3Vx6sVAXzuG4',
                directUrl: 'https://i.giphy.com/media/T3Vx6sVAXzuG4/giphy.gif',
                thumbnail: 'https://i.giphy.com/media/T3Vx6sVAXzuG4/200w.gif',
                title: 'Funny Baby GIF',
                platform: 'giphy',
                isPlaceholder: true
            }
        ];
    }
    
    createImgurPlaceholders() {
        return [
            {
                id: 'placeholder-imgur-1',
                type: 'image',
                embedUrl: 'https://via.placeholder.com/500x400/4A90E2/FFFFFF?text=Funny+Image+Coming+Soon',
                directUrl: 'https://via.placeholder.com/500x400/4A90E2/FFFFFF?text=Funny+Image+Coming+Soon',
                thumbnail: 'https://via.placeholder.com/200x150/4A90E2/FFFFFF?text=Soon',
                title: 'Imgur Content Coming Soon',
                platform: 'imgur',
                isPlaceholder: true
            }
        ];
    }
    
    // Update all image sources
    async updateAllImages() {
        console.log('🚀 Starting automatic image discovery...');
        
        const updates = [
            this.updateLocalImages(),
            this.updateAdContent(),
            this.updateGiphyImages(),
            this.updateImgurImages()
        ];
        
        await Promise.all(updates);
        await this.saveCachedImages();
        
        const stats = this.getCacheStats();
        console.log(`✅ Image discovery completed: ${stats.totalImages} total images`);
        
        return stats;
    }
    
    // Get random image based on platform weights
    getRandomImage() {
        const allImages = [
            ...this.imageCache.local,
            ...this.imageCache.giphy,
            ...this.imageCache.imgur
        ];
        
        if (allImages.length === 0) {
            return this.getFallbackImage();
        }
        
        // Apply platform weighting
        const random = Math.random() * 100;
        let platformImages = [];
        
        if (random < this.imageConfig.local.weight) {
            platformImages = this.imageCache.local;
        } else if (random < this.imageConfig.local.weight + this.imageConfig.giphy.weight) {
            platformImages = this.imageCache.giphy;
        } else {
            platformImages = this.imageCache.imgur;
        }
        
        if (platformImages.length === 0) {
            // Fallback to any available images
            platformImages = allImages;
        }
        
        const randomIndex = Math.floor(Math.random() * platformImages.length);
        return platformImages[randomIndex];
    }
    
    // Fallback image when no content is available
    getFallbackImage() {
        return {
            id: 'fallback',
            type: 'placeholder',
            embedUrl: 'https://via.placeholder.com/500x400/4A90E2/FFFFFF?text=Images+Loading...',
            directUrl: 'https://via.placeholder.com/500x400/4A90E2/FFFFFF?text=Images+Loading...',
            thumbnail: 'https://via.placeholder.com/200x150/4A90E2/FFFFFF?text=Loading',
            title: 'Images Loading...',
            platform: 'fallback'
        };
    }
    
    // Start periodic updates
    startPeriodicUpdates() {
        // Check if cache needs immediate update
        const lastUpdate = Math.max(
            this.imageCache.lastUpdated.local ? new Date(this.imageCache.lastUpdated.local).getTime() : 0,
            this.imageCache.lastUpdated.giphy ? new Date(this.imageCache.lastUpdated.giphy).getTime() : 0,
            this.imageCache.lastUpdated.imgur ? new Date(this.imageCache.lastUpdated.imgur).getTime() : 0
        );
        
        if (Date.now() - lastUpdate > this.updateInterval) {
            console.log('🔄 Image cache is stale, updating now...');
            this.updateAllImages();
        }
        
        // Set up periodic updates every 4 hours
        setInterval(() => {
            console.log('⏰ Scheduled image cache update starting...');
            this.updateAllImages();
        }, this.updateInterval);
        
        console.log(`📅 Image auto-discovery scheduled every ${this.updateInterval / (60 * 60 * 1000)} hours`);
    }
    
    // Get cache statistics
    getCacheStats() {
        return {
            local: {
                count: this.imageCache.local.length,
                lastUpdated: this.imageCache.lastUpdated.local,
                hasPlaceholders: this.imageCache.local.some(i => i.isPlaceholder)
            },
            giphy: {
                count: this.imageCache.giphy.length,
                lastUpdated: this.imageCache.lastUpdated.giphy,
                hasPlaceholders: this.imageCache.giphy.some(i => i.isPlaceholder)
            },
            imgur: {
                count: this.imageCache.imgur.length,
                lastUpdated: this.imageCache.lastUpdated.imgur,
                hasPlaceholders: this.imageCache.imgur.some(i => i.isPlaceholder)
            },
            totalImages: this.imageCache.local.length + this.imageCache.giphy.length + this.imageCache.imgur.length,
            nextUpdate: new Date(Date.now() + this.updateInterval).toISOString()
        };
    }
    
    // Force refresh (for admin/testing)
    async forceRefresh() {
        console.log('🔄 Force refreshing image cache...');
        return await this.updateAllImages();
    }
}

module.exports = AutoImageManager;

