# ROFLFaucet Deployment Context

## 🎯 **Project Overview**
ROFLFaucet - Cryptocurrency faucet with User Data API integration. Users complete captcha to earn UselessCoins that work across all network sites.

## 🖥️ **Deployment Target**
- **Server**: ES7 (Production Server)
- **SSH Alias**: `es7-production`
- **IP**: 89.116.44.206 (Updated)
- **Domain**: https://roflfaucet.com
- **Path**: `/root/roflfaucet`
- **Architecture**: Static site with OAuth + User Data API

## 🔧 **Deployment Script**
- **Script**: `deploy-roflfaucet.sh`
- **Language**: Bash
- **Auto mode**: `./deploy-roflfaucet.sh --auto`

## 📋 **Deployment Process**
1. Git status check and auto-commit
2. Create timestamped backup on server
3. Clean old backups (keep 5 most recent)
4. rsync files to server (excludes .git, logs, backups)
5. No npm install (static site)
6. No PM2 restart (static files served by nginx)
7. Health check via HTTPS

## 🔍 **Health Check URLs**
- Main site: https://roflfaucet.com
- User Data API: https://data.directsponsor.org/api/dashboard?site_id=roflfaucet
- OAuth API: https://auth.directsponsor.org/oauth/userinfo

## ⚙️ **Runtime Environment**
- **Technology**: Static HTML/CSS/JS site
- **Web Server**: nginx (serves static files)
- **No backend process**: Simplified from Node.js
- **APIs**: Integrated with auth.directsponsor.org and data.directsponsor.org

## 📁 **File Exclusions**
- `.git/` (not needed on production)
- `*.log` (server generates its own)
- `deploy.sh` (not needed on server)
- `backup_*` (temporary backup files)

## 🔐 **Security**
- Uses `warp` SSH key via `es7-production` alias
- SSL certificate configured for roflfaucet.com
- Production npm dependencies only

## 🚨 **Common Issues**
- 404 errors → Check nginx config and file permissions
- OAuth login failures → Verify auth.directsponsor.org connectivity
- API integration issues → Check data.directsponsor.org accessibility
- SSL/domain issues → Verify DNS and certificate

## ✅ **Current Working Features (June 19, 2025 - Evening)**
- Real OAuth authentication with auth.directsponsor.org
- Live faucet claims earning 5 UselessCoins per claim  
- 1-hour cooldown system with real-time tracking
- Cross-site balance system (coins work on all network sites)
- User dashboard showing balance, claim status, and activity
- User preferences system (global + site-specific)

## 📚 **Related Documentation**
- Server docs: `/docs/docs/servers/es7-listmonk.md`
- Deployment standard: `/projects/DEPLOYMENT_STANDARD.md`
- Current session context: `/projects/CURRENT_INFRASTRUCTURE_CONTEXT.md`

---
**Last Updated**: 2025-06-19  
**Status**: ✅ Live and functional

