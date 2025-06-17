# ROFLFaucet TODO

## High Priority

### 🚨 URGENT - Bitcoin4Ghana Launch Preparation
- [x] **Beta Styling Implementation** ✅ COMPLETED 2025-06-13
  - Priority: CRITICAL - bitcoin4ghana launching soon
  - Added: 2025-06-13 (from Andy's notes)
  - Requirements:
    - ✅ Red triangle at top left with "BETA" text (white text on red background)
    - ✅ Base font size, not too big but visible
    - ✅ Add "(beta)" after "ROFLFaucet" title
    - ✅ Updated emoji branding from 🚰 to 🤣 (ROFL = Rolling On Floor Laughing)
  - Context: Can't waste bitcoin4ghana publicity opportunity without ROFLFaucet ready for signups
  - Focus: Get core functionality working, perfect implementation can wait
  - **Git Workflow**: Enhanced deploy script now includes automatic git commits and VPS backups
  - **Deployment**: Use `./deploy.sh --auto` for automated deployment with git workflow
  - **Status**: ✅ Live at https://roflfaucet.com with perfect triangular beta indicator

- [ ] **Deploy media engagement strategy to production**
  - Status: Ready for deployment
  - Added: 2025-06-05
  - Context: Always-visible media slots implemented locally, needs production deployment
  - Action needed: Run deployment script to push changes live

## Medium Priority
- [ ] **Professional Favicon Implementation**
  - Status: Ready for implementation
  - Added: 2025-06-13
  - Context: Currently using basic emoji SVG favicon, need proper multi-size favicon
  - Emoji: 🤣 (Rolling On Floor Laughing - perfect for ROFL branding)
  - Tool: Use https://realfavicongenerator.net/ for comprehensive favicon generation
  - Deliverables: 
    - favicon.ico (multiple sizes)
    - apple-touch-icon.png
    - Android icons
    - Windows tile icons
    - Safari pinned tab icon
  - Priority: Medium (current emoji favicon works but professional implementation needed)

- [ ] **Remove ROFL background video from YouTube channel**
  - Status: Pending
  - Added: 2025-06-05
  - Context: Background video needs to be removed from @roflfaucet8041 YouTube channel
  - Action needed: Access YouTube Studio and delete/unlist the background video

## New Features

- [ ] **Unified Site-Wide Ad Network System**
  - Added: 2025-06-14 (from Andy's strategic planning)
  - **Current Status**: ROFLFaucet has ad rotation system, docs site has sidebar ads working
  - **Goal**: Extend existing ROFLFaucet ad system to serve entire SatoshiHost network
  - **Vision**: Central ad network that all sites can tap into
  - **Technical Requirements**:
    - API endpoints for other sites to fetch ads
    - Configurable ad "bunches" - sites can select specific categories
    - Unified content management for ads, funny images, project promotions
    - Cross-site rotation logic and analytics
  - **Integration Points**:
    - Docs site sidebar ads (already implemented, ready to connect)
    - ClickForCharity site integration
    - DirectSponsor site integration
    - Any future network sites
  - **Benefits**:
    - Consistent cross-promotion across all projects
    - Centralized content management
    - Network-wide marketing efficiency
    - Easier content updates across sites
  - **Priority**: Medium-High - improves entire network operation
- [ ] **Content Positioning System**
  - Added: 2025-06-09
  - Weighted content management for sidebars and center column

- [ ] **Cross-Platform Wallet Integration via DirectSponsor OAuth**
  - Added: 2025-06-11 (From Andy's integration planning notes)
  - **Prerequisite**: DirectSponsor OAuth fully operational and tested
  - **Core Feature**: Universal coin/token tracking system across all sites
  - **User Benefits**:
    - Balances carry across all platforms (ROFLFaucet, ClickForCharity, DirectSponsor)
    - Rewards for engagement even on non-game sites (visits, comments, participation)
    - Automated participation bonuses (separate from native likes/zaps)
  - **Technical Requirements**:
    - Integration with DirectSponsor authentication system
    - Cross-site balance synchronization
    - Automated reward tracking for various engagement types
    - Clear separation between native platform rewards and bonus system
  - **Next Steps**:
    - Complete DirectSponsor OAuth testing and verification
    - Design cross-platform wallet API
    - Plan automated engagement reward system
    - Implement without confusing users about native vs bonus rewards
  - **Strategic Value**: Creates unified user experience across entire charity network
  - Weight (0-100): Controls frequency of appearance relative to other content
  - Importance (0-100): Controls likelihood to appear high on page
  - Content types: Ad network ads, self-hosted ads, GIFs, project links, banners
  - Admin interface: Form-based content management with weight/importance controls
  - Special values: 100=always show/top, 0=never show/bottom (for temporary disable)
  - Zones: Left/right sidebars + center column horizontal banners + landscape images

- [ ] **Gaming modal for token depletion**
  - Added: 2025-06-08
  - Feature: When tokens run out, show dismissable modal saying "you've gambled away all your tokens"
  - Options: "Go to faucet" or "Buy more tokens"
  - Note: Corrected terminology - tokens for gaming, coins for universal currency

- [ ] **Universal Coin System Integration**
  - Added: 2025-06-08
  - Background coin earning for page views, engagement, sign-ins
  - Fractional rewards (0.001 coins) with transient notifications
  - Simultaneous token + coin earning during gameplay
  - Cross-platform coin wallet integration

## Low Priority

## Completed
*(Move completed items here for reference)*

---
**Last Updated**: 2025-06-08

# ROFLFaucet TODO List

## 🐛 **Current Issues**

### High Priority

#### Media Slots Integration 🎭🖼️
- **Status**: ✅ BOTH WORKING PERFECTLY! 🎉
- **LEFT SLOT (Giphy)**: ✅ Animated GIFs from curated collection
- **RIGHT SLOT (Imgur)**: ✅ SB2 album and other Imgur content
- **RESOLUTION**: Debug logging fixed cache initialization issue
- **API Response**: Now returns proper `imgur-album-KyGEZvL` with embedHtml
- **Final Status**: Professional dynamic media content on both sidebars
- **Created**: 2025-06-05
- **RESOLVED**: 2025-06-05 ✨ SESSION SUCCESS!

#### Browser Compatibility - Web (WebKitGTK 2.48.1)
- **Status**: Layout broken
- **Symptoms**: 
  - Ad content takes full screen width
  - CSS appears not to load properly
  - Content displays as unformatted text
  - Some content appears below ads like mobile layout
- **Browser**: Web (lightweight browser powered by WebKitGTK 2.48.1)
- **Note**: User has had trouble with this browser before
- **Priority**: Low (browser-specific issue)
- **Created**: 2025-06-05
- **Next Check**: 2025-06-12 (check if issue persists)

### Medium Priority

#### Content Security Policy Documentation
- **Status**: ✅ Complete
- **Created comprehensive CSP guide**: `docs/CSP_GUIDE.md`
- **Covers**: frame-src, script-src, different media platform requirements

## 💰 **ECONOMIC MODEL UPDATE** (2025-06-05)

### Bitcoin Fork Strategy - Fixed 5 Coin System
- **Status**: ✅ Implemented
- **Coin Supply**: 21M limit (Bitcoin fork)
- **Award Amount**: Fixed 5 coins per claim (no more random amounts)
- **Circular Economy**: Users vote monthly, unvoted coins go to charity fund
- **Success Metric**: If we run out of coins, we're extremely successful!

**Benefits**:
- Simple, predictable rewards
- Creates real scarcity and value
- Democratic voting system with tangible impact
- Sustainable long-term economics

### Future Expansion: Coin Purchase System
- **Concept**: Allow users to buy "worthless" coins directly
- **Psychology**: People love holding tokens, even worthless ones
- **Impact**: 100% of purchase price goes directly to charity
- **No Middleman**: Direct charity funding through coin purchases
- **Better than NFTs**: Fungible, tradeable, nobody cares about uniqueness
- **Marketing**: "Buy worthless coins that do good!"
- **Documentation Note**: Keep public docs open-ended to allow this future expansion

## 🔧 **Planned Improvements**

### Content System
- [ ] **PRIORITY: Separate Scripts Per Slot** 🎯
  - Create dedicated `/api/giphy/random` for LEFT slot
  - Create dedicated `/api/imgur/random` for RIGHT slot  
  - Eliminate complex weighted selection logic
  - Each API tailored to specific platform requirements
  - Simpler, more reliable, easier to debug
  - **Benefits**: No cross-platform conflicts, cleaner code, better UX
- [ ] Add more media providers (TikTok, Instagram, etc.)
- [ ] Implement content moderation system
- [ ] Add content rating/voting system
- [ ] Cache optimization for faster loading

### User Experience
- [ ] Add mobile-responsive testing across more browsers
- [ ] Implement progressive web app features
- [ ] Add keyboard navigation support
- [ ] Improve accessibility (ARIA labels, etc.)

### CSS Standards Compliance
- [ ] Convert existing CSS from px to relative units (rem/em)
- [ ] Audit all ClickForCharity ecosystem sites for relative units compliance
- [ ] Update ROFLFaucet styles.css to use rem/em for fonts and spacing
- [ ] Update ClickForCharity main site CSS to follow new guidelines
- [ ] Ensure DirectSponsor (when created) follows relative units policy from start

### AI Development Standards Enforcement
- [ ] Add AI_CONTEXT.md to ClickForCharity main site project
- [ ] Add AI_CONTEXT.md to any other ecosystem projects
- [ ] Create AI_CONTEXT.md for DirectSponsor when project starts
- [ ] Update AI_CONTEXT template if standards change

### Performance
- [ ] Optimize image/video loading
- [ ] Implement lazy loading for sidebar content
- [ ] Add CDN support for static assets
- [ ] Database optimization for user data
- [ ] Review CSS file sizes after relative units conversion
- [ ] Test performance impact of CSS changes on slow connections

### Features
- [ ] Add user profiles and avatars
- [ ] Implement achievement system
- [ ] Add social sharing functionality
- [ ] Create admin dashboard

## 📋 **Maintenance Tasks**

### Weekly
- [ ] Check all media APIs are functioning
- [ ] Review server logs for errors
- [ ] Test core user flows (signup, claim, vote)

### Monthly
- [ ] Review and update CSP policies
- [ ] Check browser compatibility across major browsers
- [ ] Update content cache and remove stale entries
- [ ] Review and optimize database queries

### Quarterly
- [ ] Security audit and dependency updates
- [ ] Performance testing and optimization
- [ ] User feedback analysis and feature planning
- [ ] Backup and disaster recovery testing

## 🔍 **Debugging Checklist**

When issues arise, check:
1. **Browser Console**: Look for CSP violations, JavaScript errors
2. **Network Tab**: Check if API calls are failing
3. **Server Logs**: Review server-side errors
4. **CSP Headers**: Ensure all required domains are whitelisted
5. **API Endpoints**: Test direct API calls with curl

---

**Reminder Schedule**:
- Check high priority issues: Daily
- Check medium priority issues: Weekly  
- Check low priority issues: Weekly
- Review entire TODO: Monthly

*Last Updated: 2025-06-05*

