# ROFLFaucet Deployment Context

## 🎯 **Project Overview**
ROFLFaucet - Cryptocurrency faucet with video content integration. Users watch videos to earn crypto rewards.

## 🖥️ **Deployment Target**
- **Server**: ES7 (Production Server)
- **SSH Alias**: `es7-production`
- **IP**: 89.116.173.191
- **Domain**: https://roflfaucet.com
- **Path**: `/root/roflfaucet`

## 🔧 **Deployment Script**
- **Script**: `deploy-roflfaucet.sh`
- **Language**: Bash
- **Auto mode**: `./deploy-roflfaucet.sh --auto`

## 📋 **Deployment Process**
1. Git status check and auto-commit
2. Create timestamped backup on server
3. Clean old backups (keep 5 most recent)
4. rsync files to server (excludes node_modules, .git, logs)
5. Install dependencies: `npm install --omit=dev`
6. Restart application: `pm2 restart roflfaucet`
7. Health check via API

## 🔍 **Health Check URLs**
- Main site: https://roflfaucet.com
- Health API: https://roflfaucet.com/api/health
- Video API: https://roflfaucet.com/api/video/random

## ⚙️ **Runtime Environment**
- **Technology**: Node.js application
- **Process Manager**: PM2
- **Service Name**: `roflfaucet`
- **Dependencies**: npm packages (production only)

## 📁 **File Exclusions**
- `node_modules/` (rebuilt on server)
- `.git/` (not needed on production)
- `*.log` (server generates its own)
- `deploy.sh` (not needed on server)

## 🔐 **Security**
- Uses `warp` SSH key via `es7-production` alias
- SSL certificate configured for roflfaucet.com
- Production npm dependencies only

## 🚨 **Common Issues**
- npm install failures → Check Node.js version
- PM2 restart issues → Check process status with `pm2 status`
- SSL/domain issues → Verify DNS and certificate

## 📚 **Related Documentation**
- Server docs: `/docs/docs/servers/es7-listmonk.md`
- Deployment standard: `/projects/DEPLOYMENT_STANDARD.md`
- Current session context: `/projects/CURRENT_INFRASTRUCTURE_CONTEXT.md`

---
**Last Updated**: 2025-06-19  
**Status**: ✅ Live and functional

