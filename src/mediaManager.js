// Enhanced Media Manager - Supports Videos, GIFs, and Images with Smart Format Selection
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class EnhancedMediaManager {
    constructor() {
        this.mediaConfig = {
            // Imgur integration
            imgur: {
                enabled: true,
                albums: [
                    'KyGEZvL', // Your existing album (corrected ID)
                    // Add more album IDs here
                ],
                weight: 30 // 30% of media comes from Imgur
            },
            
            // YouTube/Odysee videos (existing)
            video: {
                enabled: true,
                weight: 40 // 40% videos
            },
            
            // Local/Giphy GIFs (existing)
            giphy: {
                enabled: true,
                weight: 30 // 30% Giphy
            }
        };
        
        this.mediaCache = {
            imgur: [],
            video: [],
            giphy: [],
            lastUpdated: {
                imgur: null,
                video: null,
                giphy: null
            }
        };
        
        this.cacheFile = path.join(__dirname, '../data/media-cache.json');
        this.updateInterval = 6 * 60 * 60 * 1000; // 6 hours
        
        this.init();
    }
    
    async init() {
        await this.loadCachedMedia();
        this.startPeriodicUpdates();
    }
    
    // Load cached media from file
    async loadCachedMedia() {
        try {
            const data = await fs.readFile(this.cacheFile, 'utf8');
            this.mediaCache = JSON.parse(data);
            console.log('🎬 Media cache loaded from file');
        } catch (error) {
            console.log('🎬 No existing media cache, creating initial cache...');
            await this.updateAllMedia();
        }
    }
    
    // Save media cache to file
    async saveCachedMedia() {
        try {
            await fs.mkdir(path.dirname(this.cacheFile), { recursive: true });
            await fs.writeFile(this.cacheFile, JSON.stringify(this.mediaCache, null, 2));
            console.log('🎬 Media cache saved successfully');
        } catch (error) {
            console.error('❌ Error saving media cache:', error.message);
        }
    }
    
    // Imgur album discovery using oEmbed API
    async updateImgurMedia() {
        try {
            console.log('📷 Discovering Imgur albums...');
            const allMedia = [];
            
            for (const albumId of this.mediaConfig.imgur.albums) {
                try {
                    // Get album info using oEmbed
                    const oembedUrl = `https://api.imgur.com/oembed.json?url=https://imgur.com/a/${albumId}`;
                    const oembedResponse = await axios.get(oembedUrl, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'ROFLFaucet-MediaManager/1.0 (+https://roflfaucet.com)'
                        }
                    });
                    
                    if (oembedResponse.data && oembedResponse.data.html) {
                        // Parse the album ID from embed HTML
                        const albumMatch = oembedResponse.data.html.match(/data-id="a\/([^"]+)"/);
                        const cleanAlbumId = albumMatch ? albumMatch[1] : albumId;
                        
                        allMedia.push({
                            id: `imgur-album-${cleanAlbumId}`,
                            type: 'imgur-album',
                            albumId: cleanAlbumId,
                            embedHtml: oembedResponse.data.html,
                            title: `Imgur Album - ${oembedResponse.data.author_name || 'Unknown'}`,
                            author: oembedResponse.data.author_name,
                            width: oembedResponse.data.width,
                            height: oembedResponse.data.height,
                            platform: 'imgur',
                            isAlbum: true,
                            mediaCount: 'multiple', // Albums contain multiple items
                            supportsAutoplay: true, // Imgur embeds handle autoplay
                            supportsLoop: true // Imgur GIFs loop automatically
                        });
                        
                        console.log(`✅ Found Imgur album: ${cleanAlbumId}`);
                    }
                } catch (albumError) {
                    console.log(`⚠️  Could not load album ${albumId}:`, albumError.message);
                }
            }
            
            if (allMedia.length > 0) {
                this.mediaCache.imgur = allMedia;
                this.mediaCache.lastUpdated.imgur = new Date().toISOString();
                console.log(`✅ Found ${allMedia.length} Imgur albums`);
            } else {
                console.log('⚠️  No Imgur albums found, using placeholders');
                this.mediaCache.imgur = this.createImgurPlaceholders();
            }
            
        } catch (error) {
            console.error('❌ Error updating Imgur media:', error.message);
            if (this.mediaCache.imgur.length === 0) {
                this.mediaCache.imgur = this.createImgurPlaceholders();
            }
        }
    }
    
    // Create Imgur placeholder media
    createImgurPlaceholders() {
        return [
            {
                id: 'placeholder-imgur-1',
                type: 'imgur-album',
                albumId: 'placeholder',
                embedHtml: '<div style=\"text-align: center; padding: 40px; background: #f5f5f5; border-radius: 8px;\"><p>🖼️ Imgur content loading...</p><p><small>Check back soon for funny images!</small></p></div>',
                title: 'Imgur Gallery Loading...',
                platform: 'imgur',
                isPlaceholder: true
            }
        ];
    }
    
    // Get random media with intelligent format selection
    getRandomMedia() {
        console.log('🎯 getRandomMedia called');
        console.log('📊 Cache contents:', {
            imgur: this.mediaCache.imgur?.length || 0,
            video: this.mediaCache.video?.length || 0, 
            giphy: this.mediaCache.giphy?.length || 0
        });
        
        const allMedia = [...this.mediaCache.imgur, ...this.mediaCache.video, ...this.mediaCache.giphy];
        console.log('📝 Total media items:', allMedia.length);
        
        if (allMedia.length === 0) {
            console.log('❌ No media found, returning fallback');
            return this.getFallbackMedia();
        }
        
        // Weighted random selection
        const totalWeight = this.mediaConfig.imgur.weight + this.mediaConfig.video.weight + this.mediaConfig.giphy.weight;
        const random = Math.random() * totalWeight;
        
        let currentWeight = 0;
        
        // Select media type based on weights
        if (random < (currentWeight += this.mediaConfig.imgur.weight) && this.mediaCache.imgur.length > 0) {
            // Imgur media
            const imgurMedia = this.mediaCache.imgur;
            const randomIndex = Math.floor(Math.random() * imgurMedia.length);
            return this.enhanceMediaObject(imgurMedia[randomIndex]);
        } else if (random < (currentWeight += this.mediaConfig.video.weight) && this.mediaCache.video.length > 0) {
            // Video media (existing system)
            const videoMedia = this.mediaCache.video;
            const randomIndex = Math.floor(Math.random() * videoMedia.length);
            return this.enhanceMediaObject(videoMedia[randomIndex]);
        } else if (this.mediaCache.giphy.length > 0) {
            // Giphy media (existing system)
            const giphyMedia = this.mediaCache.giphy;
            const randomIndex = Math.floor(Math.random() * giphyMedia.length);
            return this.enhanceMediaObject(giphyMedia[randomIndex]);
        }
        
        return this.getFallbackMedia();
    }
    
    // Enhance media object with smart format selection
    enhanceMediaObject(media) {
        const enhanced = { ...media };
        
        // Add browser capability detection
        enhanced.formatOptions = this.getFormatOptions(media);
        enhanced.selectedFormat = this.selectOptimalFormat(media);
        enhanced.displayMethod = this.getDisplayMethod(media);
        
        return enhanced;
    }
    
    // Determine available format options
    getFormatOptions(media) {
        const options = [];
        
        if (media.type === 'imgur-album') {
            options.push({
                format: 'embed',
                url: null, // Uses embedHtml instead
                size: 'responsive',
                quality: 'high',
                autoplay: true,
                loop: true,
                bandwidth: 'medium'
            });
        } else if (media.platform === 'youtube' || media.platform === 'odysee') {
            options.push({
                format: 'iframe',
                url: media.embedUrl,
                size: 'responsive',
                quality: 'high',
                autoplay: false, // Platform controlled
                loop: false, // Platform controlled
                bandwidth: 'high'
            });
        } else if (media.type === 'giphy') {
            options.push({
                format: 'gif',
                url: media.directUrl,
                size: 'fixed',
                quality: 'medium',
                autoplay: true,
                loop: true,
                bandwidth: 'medium'
            });
        }
        
        return options;
    }
    
    // Select optimal format based on browser capabilities and user preferences
    selectOptimalFormat(media) {
        const options = this.getFormatOptions(media);
        
        if (options.length === 0) {
            return null;
        }
        
        // For now, return the first (and often only) option
        // In the future, this could include user preferences, bandwidth detection, etc.
        return options[0];
    }
    
    // Determine how to display the media
    getDisplayMethod(media) {
        if (media.type === 'imgur-album') {
            return 'embed-html';
        } else if (media.platform === 'youtube' || media.platform === 'odysee') {
            return 'iframe';
        } else if (media.type === 'giphy') {
            return 'iframe'; // Giphy also uses iframes
        }
        
        return 'fallback';
    }
    
    // Fallback media when no content is available
    getFallbackMedia() {
        return {
            id: 'fallback',
            type: 'fallback',
            title: 'Media Loading...',
            embedHtml: '<div style=\"text-align: center; padding: 40px; background: #f5f5f5; border-radius: 8px;\"><p>🎬 Media content is being updated</p><p><small>Please try again soon!</small></p></div>',
            platform: 'fallback',
            displayMethod: 'embed-html'
        };
    }
    
    // Update all media sources
    async updateAllMedia() {
        console.log('🚀 Starting media discovery...');
        
        const updates = [];
        
        if (this.mediaConfig.imgur.enabled) {
            updates.push(this.updateImgurMedia());
        }
        
        // Note: Video and Giphy updates would integrate with existing managers
        // For now, we'll focus on the Imgur integration
        
        await Promise.all(updates);
        await this.saveCachedMedia();
        
        const stats = this.getCacheStats();
        console.log(`✅ Media discovery completed: ${stats.totalMedia} total items`);
        
        return stats;
    }
    
    // Start periodic updates
    startPeriodicUpdates() {
        // Check if cache needs immediate update
        const lastUpdate = this.mediaCache.lastUpdated.imgur
            ? new Date(this.mediaCache.lastUpdated.imgur).getTime()
            : 0;
        
        if (Date.now() - lastUpdate > this.updateInterval) {
            console.log('🔄 Media cache is stale, updating now...');
            this.updateAllMedia();
        }
        
        // Set up periodic updates every 6 hours
        setInterval(() => {
            console.log('⏰ Scheduled media cache update starting...');
            this.updateAllMedia();
        }, this.updateInterval);
        
        console.log(`📅 Media auto-discovery scheduled every ${this.updateInterval / (60 * 60 * 1000)} hours`);
    }
    
    // Get cache statistics
    getCacheStats() {
        return {
            imgur: {
                count: this.mediaCache.imgur.length,
                lastUpdated: this.mediaCache.lastUpdated.imgur,
                hasPlaceholders: this.mediaCache.imgur.some(m => m.isPlaceholder)
            },
            video: {
                count: this.mediaCache.video.length,
                lastUpdated: this.mediaCache.lastUpdated.video
            },
            giphy: {
                count: this.mediaCache.giphy.length,
                lastUpdated: this.mediaCache.lastUpdated.giphy
            },
            totalMedia: this.mediaCache.imgur.length + this.mediaCache.video.length + this.mediaCache.giphy.length,
            nextUpdate: new Date(Date.now() + this.updateInterval).toISOString()
        };
    }
    
    // Force refresh (for admin/testing)
    async forceRefresh() {
        console.log('🔄 Force refreshing media cache...');
        return await this.updateAllMedia();
    }
}

module.exports = EnhancedMediaManager;

