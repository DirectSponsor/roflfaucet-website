// Automatic Video Discovery and Management System
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class AutoVideoManager {
    constructor() {
        this.channelConfig = {
            youtube: {
                channelHandle: '@roflfaucet8041',
                weight: 100 // Use 100% YouTube for now
            },
            odysee: {
                channelName: 'roflfaucet:7',
                channelNameWithAt: '@roflfaucet:7',
                channelUrl: 'https://odysee.com/@roflfaucet:7',
                weight: 0, // Disabled for now - TODO: Fix API integration
                enabled: false
            }
        };
        
        this.videoCache = {
            youtube: [],
            odysee: [],
            lastUpdated: {
                youtube: null,
                odysee: null
            }
        };
        
        this.cacheFile = path.join(__dirname, '../data/video-cache.json');
        this.updateInterval = 6 * 60 * 60 * 1000; // 6 hours
        
        this.init();
    }
    
    async init() {
        await this.loadCachedVideos();
        this.startPeriodicUpdates();
    }
    
    // Load cached videos from file
    async loadCachedVideos() {
        try {
            const data = await fs.readFile(this.cacheFile, 'utf8');
            this.videoCache = JSON.parse(data);
            console.log('📹 Video cache loaded from file');
        } catch (error) {
            console.log('📹 No existing video cache, creating initial cache...');
            await this.updateAllVideos();
        }
    }
    
    // Save video cache to file
    async saveCachedVideos() {
        try {
            await fs.mkdir(path.dirname(this.cacheFile), { recursive: true });
            await fs.writeFile(this.cacheFile, JSON.stringify(this.videoCache, null, 2));
            console.log('📹 Video cache saved successfully');
        } catch (error) {
            console.error('❌ Error saving video cache:', error.message);
        }
    }
    
    // YouTube video discovery using RSS feed (no API key required)
    async updateYouTubeVideos() {
        try {
            console.log('🔍 Discovering YouTube videos from @roflfaucet8041...');
            
            // First, try to get channel ID
            const channelId = await this.getYouTubeChannelId();
            if (!channelId) {
                console.log('⚠️  Could not find YouTube channel ID, using placeholder');
                this.videoCache.youtube = this.createYouTubePlaceholders();
                return;
            }
            
            // Use RSS feed to get latest videos
            const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
            const response = await axios.get(rssUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'ROFLFaucet-VideoManager/1.0 (+https://roflfaucet.com)'
                }
            });
            
            // Parse RSS feed
            const videos = this.parseYouTubeRSS(response.data);
            
            if (videos.length > 0) {
                this.videoCache.youtube = videos;
                this.videoCache.lastUpdated.youtube = new Date().toISOString();
                console.log(`✅ Found ${videos.length} YouTube videos`);
            } else {
                console.log('⚠️  No YouTube videos found, using placeholders');
                this.videoCache.youtube = this.createYouTubePlaceholders();
            }
            
        } catch (error) {
            console.error('❌ Error updating YouTube videos:', error.message);
            if (this.videoCache.youtube.length === 0) {
                this.videoCache.youtube = this.createYouTubePlaceholders();
            }
        }
    }
    
    // Get YouTube channel ID from handle
    async getYouTubeChannelId() {
        try {
            const channelUrl = `https://www.youtube.com/${this.channelConfig.youtube.channelHandle}`;
            const response = await axios.get(channelUrl, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            // Extract channel ID from page
            const channelIdMatch = response.data.match(/"channelId":"([^"]+)"|"externalId":"([^"]+)"/); 
            if (channelIdMatch) {
                const channelId = channelIdMatch[1] || channelIdMatch[2];
                console.log(`🎯 Found YouTube channel ID: ${channelId}`);
                return channelId;
            }
                
        } catch (error) {
            console.error('❌ Error getting YouTube channel ID:', error.message);
        }
        return null;
    }
    
    // Parse YouTube RSS feed
    parseYouTubeRSS(xmlData) {
        const videos = [];
        
        try {
            const entryMatches = xmlData.match(/<entry[^>]*>([\s\S]*?)<\/entry>/g) || [];
            
            entryMatches.forEach(entry => {
                const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
                const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
                const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
                
                if (idMatch && titleMatch) {
                    videos.push({
                        id: idMatch[1],
                        title: titleMatch[1]
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"'),
                            embedUrl: `https://www.youtube.com/embed/${idMatch[1]}?rel=0`,
                        description: `YouTube video from @roflfaucet8041`,
                        publishedAt: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
                        platform: 'youtube',
                        thumbnail: `https://img.youtube.com/vi/${idMatch[1]}/mqdefault.jpg`
                    });
                }
            });
        } catch (error) {
            console.error('❌ Error parsing YouTube RSS:', error.message);
        }
        
        return videos.slice(0, 20); // Limit to 20 most recent
    }
    
    // Odysee video discovery
    async updateOdyseeVideos() {
        try {
            console.log(`🔍 Discovering Odysee videos from ${this.channelConfig.odysee.channelName}...`);
            
            // Try different API approaches for Odysee
            // Method 1: Direct API call
            const apiUrl = 'https://api.odysee.com/api/v1/proxy';
            const requestData = {
                method: 'claim_search',
                params: {
                    channel: this.channelConfig.odysee.channelName,
                    page_size: 20,
                    order_by: 'release_time',
                    stream_type: 'video'
                }
            };
            
            // Try API first, then fallback to web scraping
            let videos = [];
            
            try {
                console.log('🔍 Trying API call with channel name:', this.channelConfig.odysee.channelName);
                console.log('📋 API request data:', JSON.stringify(requestData, null, 2));
                
                const response = await axios.post(apiUrl, requestData, {
                    timeout: 15000,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'ROFLFaucet-VideoManager/1.0 (+https://roflfaucet.com)'
                    }
                });
                
                console.log('📡 API response status:', response.status);
                console.log('📄 API response data structure:', Object.keys(response.data || {}));
                
                if (response.data.data && response.data.data.items) {
                    videos = response.data.data.items
                        .filter(item => item.value_type === 'stream')
                        .map(item => ({
                            id: item.claim_id,
                            title: item.value.title,
                            embedUrl: `https://odysee.com/$/embed/${item.name}:${item.claim_id}`,
                            description: item.value.description || 'Odysee video from @roflfaucet:7',
                            publishedAt: new Date(item.value.release_time * 1000).toISOString(),
                            platform: 'odysee',
                            thumbnail: item.value.thumbnail ? item.value.thumbnail.url : null,
                            duration: item.value.video ? item.value.video.duration : null
                        }));
                }
            } catch (apiError) {
                console.log('⚠️  API method failed:', apiError.message);
                if (apiError.response) {
                    console.log('📡 Error response status:', apiError.response.status);
                    console.log('📄 Error response data:', JSON.stringify(apiError.response.data, null, 2));
                }
                console.log('🔄 Trying alternative approach...');
                
                // Fallback: Try to get channel info from web page
                try {
                    const channelResponse = await axios.get(this.channelConfig.odysee.channelUrl, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; ROFLFaucet-VideoManager)'
                        }
                    });
                    
                    // Basic scraping for video URLs (this is a simple fallback)
                    const videoMatches = channelResponse.data.match(/"contentUrl":"([^"]+)"/g) || [];
                    const titleMatches = channelResponse.data.match(/"title":"([^"]+)"/g) || [];
                    
                    videos = videoMatches.slice(0, 5).map((match, index) => {
                        const url = match.match(/"contentUrl":"([^"]+)"/)[1];
                        const titleMatch = titleMatches[index];
                        const title = titleMatch ? titleMatch.match(/"title":"([^"]+)"/)[1] : `ROFLFaucet Video ${index + 1}`;
                        
                        return {
                            id: `scraped-${Date.now()}-${index}`,
                            title: title.replace(/\\u[0-9a-fA-F]{4}/g, ''), // Remove unicode escapes
                            embedUrl: url.replace(/\\\\/g, '/'), // Fix escaped slashes
                            description: 'Odysee video from @roflfaucet:7',
                            publishedAt: new Date().toISOString(),
                            platform: 'odysee',
                            thumbnail: null,
                            isFallback: true
                        };
                    });
                } catch (scrapeError) {
                    console.log('⚠️  Web scraping also failed, using placeholders');
                }
            }
            
            if (videos.length > 0) {
                this.videoCache.odysee = videos;
                this.videoCache.lastUpdated.odysee = new Date().toISOString();
                console.log(`✅ Found ${videos.length} Odysee videos`);
            } else {
                console.log('⚠️  No Odysee videos found, using placeholders');
                this.videoCache.odysee = this.createOdyseePlaceholders();
            }
            
        } catch (error) {
            console.error('❌ Error updating Odysee videos:', error.message);
            if (this.videoCache.odysee.length === 0) {
                this.videoCache.odysee = this.createOdyseePlaceholders();
            }
        }
    }
    
    // Create YouTube placeholder videos
    createYouTubePlaceholders() {
        return [
            {
                id: 'placeholder-yt-1',
                title: 'ROFLFaucet Channel Coming Soon!',
                embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Rick roll as placeholder
                description: 'Subscribe to @roflfaucet8041 for upcoming content!',
                publishedAt: new Date().toISOString(),
                platform: 'youtube',
                isPlaceholder: true
            }
        ];
    }
    
    // Create Odysee placeholder videos
    createOdyseePlaceholders() {
        return [
            {
                id: 'placeholder-od-1',
                title: 'Welcome to ROFLFaucet!',
                embedUrl: 'about:blank',
                description: 'Subscribe to @roflfaucet:7 on Odysee for hilarious crypto content!',
                publishedAt: new Date().toISOString(),
                platform: 'odysee',
                isPlaceholder: true
            },
            {
                id: 'placeholder-od-2',
                title: 'How Crypto Faucets Work',
                embedUrl: 'about:blank',
                description: 'Learn about the fun side of cryptocurrency',
                publishedAt: new Date().toISOString(),
                platform: 'odysee',
                isPlaceholder: true
            }
        ];
    }
    
    // Update all video sources
    async updateAllVideos() {
        console.log('🚀 Starting automatic video discovery...');
        
        const updates = [this.updateYouTubeVideos()];
        
        // Only update Odysee if enabled
        if (this.channelConfig.odysee.enabled) {
            updates.push(this.updateOdyseeVideos());
        } else {
            console.log('📺 Odysee discovery disabled - using YouTube only for now');
            this.videoCache.odysee = []; // Clear any old Odysee content
        }
        
        await Promise.all(updates);
        
        await this.saveCachedVideos();
        
        const stats = this.getCacheStats();
        console.log(`✅ Video discovery completed: ${stats.totalVideos} total videos`);
        
        return stats;
    }
    
    // Get random video based on platform weights
    getRandomVideo() {
        const allVideos = [...this.videoCache.youtube, ...this.videoCache.odysee];
        
        if (allVideos.length === 0) {
            return this.getFallbackVideo();
        }
        
        const random = Math.random() * 100;
        
        // For now, just use YouTube videos (Odysee integration coming later)
        if (this.videoCache.youtube.length > 0) {
            // Select random YouTube video (100% for now)
            const videos = this.videoCache.youtube;
            const randomIndex = Math.floor(Math.random() * videos.length);
            return {
                ...videos[randomIndex],
                showChannelPromotion: false // TODO: Add Odysee promotion when Odysee integration is fixed
            };
        } else {
            return this.getFallbackVideo();
        }
    }
    
    // Fallback video when no content is available
    getFallbackVideo() {
        return {
            id: 'fallback',
            title: 'Videos Loading...',
            embedUrl: 'about:blank',
            description: 'Video content is being updated, please try again soon!',
            platform: 'fallback',
            showChannelPromotion: false
        };
    }
    
    // Start periodic updates
    startPeriodicUpdates() {
        // Check if cache needs immediate update
        const lastYouTubeUpdate = this.videoCache.lastUpdated.youtube
            ? new Date(this.videoCache.lastUpdated.youtube).getTime()
            : 0;
        const lastOdyseeUpdate = this.videoCache.lastUpdated.odysee
            ? new Date(this.videoCache.lastUpdated.odysee).getTime()
            : 0;
        
        const oldestUpdate = Math.min(lastYouTubeUpdate, lastOdyseeUpdate);
        
        if (Date.now() - oldestUpdate > this.updateInterval) {
            console.log('🔄 Video cache is stale, updating now...');
            this.updateAllVideos();
        }
        
        // Set up periodic updates every 6 hours
        setInterval(() => {
            console.log('⏰ Scheduled video cache update starting...');
            this.updateAllVideos();
        }, this.updateInterval);
        
        console.log(`📅 Video auto-discovery scheduled every ${this.updateInterval / (60 * 60 * 1000)} hours`);
    }
    
    // Get cache statistics
    getCacheStats() {
        return {
            youtube: {
                count: this.videoCache.youtube.length,
                lastUpdated: this.videoCache.lastUpdated.youtube,
                hasPlaceholders: this.videoCache.youtube.some(v => v.isPlaceholder)
            },
            odysee: {
                count: this.videoCache.odysee.length,
                lastUpdated: this.videoCache.lastUpdated.odysee,
                hasPlaceholders: this.videoCache.odysee.some(v => v.isPlaceholder)
            },
            totalVideos: this.videoCache.youtube.length + this.videoCache.odysee.length,
            nextUpdate: new Date(Date.now() + this.updateInterval).toISOString()
        };
    }
    
    // Force refresh (for admin/testing)
    async forceRefresh() {
        console.log('🔄 Force refreshing video cache...');
        return await this.updateAllVideos();
    }
}

module.exports = AutoVideoManager;

