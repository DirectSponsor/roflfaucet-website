# ROFLFaucet Deployment Strategy

## Domain: roflfaucet.com 🌐

### Current Status
- **Domain**: Owned and ready ✅
- **Current State**: "Coming Sometime..." placeholder
- **Target**: Full faucet deployment

## Deployment Environments

### 1. Development
- **URL**: `http://localhost:3000`
- **Purpose**: Local development and testing
- **Database**: Local MySQL/PostgreSQL
- **Lightning**: Testnet LND node

### 2. Staging
- **URL**: `https://staging.roflfaucet.com` (subdomain)
- **Purpose**: Pre-production testing
- **Database**: Staging database
- **Lightning**: Testnet with staging wallet

### 3. Production
- **URL**: `https://roflfaucet.com`
- **Purpose**: Live faucet system
- **Database**: Production MySQL/PostgreSQL
- **Lightning**: Mainnet LND node (secure setup)

## Infrastructure Options

### Option 1: Shared VPS Deployment (Recommended - $25/year!)
**Same VPS as Listmonk (89.116.44.206)**
- **Specs**: 3GB RAM, 1 Core, 100GB disk, 3TB bandwidth
- **Cost**: Amazing $25/year - use existing infrastructure
- **Services**: Listmonk (port 9000) + ROFLFaucet (port 3000)
- Docker deployment with docker-compose
- Nginx reverse proxy for both services
- SSL certificates via Let's Encrypt
- Shared monitoring and backups

### Option 2: Cloud Hosting
**Scalable but more complex**
- AWS/DigitalOcean/Linode
- Container orchestration (Docker Swarm/Kubernetes)
- Managed database services
- Load balancing for high traffic

### Option 3: Shared Hosting Integration
**Simple but limited**
- Deploy alongside clickforcharity.net
- Subdirectory: `clickforcharity.net/faucet`
- Redirect from roflfaucet.com
- Shared database and authentication

## Recommended Deployment Path

### Phase 1: Development Setup
```bash
# Local development
git clone repo
npm install
cp .env.example .env
npm run dev
```

### Phase 2: Staging Deployment
```bash
# On VPS, create staging subdomain
sudo docker-compose -f docker-compose.staging.yml up -d
# Point staging.roflfaucet.com to VPS
# Test all functionality
```

### Phase 3: Production Deployment
```bash
# Production deployment
sudo docker-compose -f docker-compose.prod.yml up -d
# Point roflfaucet.com to VPS
# Configure SSL
# Set up monitoring
```

## SSL and Security

### Let's Encrypt Setup
```bash
sudo certbot --nginx -d roflfaucet.com -d www.roflfaucet.com
```

### Security Headers (Nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name roflfaucet.com www.roflfaucet.com;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/roflfaucet.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/roflfaucet.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Lightning Network Setup

### Development (Testnet)
- Use public testnet faucets for funding
- Simple LND testnet node
- Test payments with small amounts

### Production (Mainnet)
- Secure Lightning node setup
- Hardware security module (HSM) for keys
- Channel management strategy
- Monitoring and alerting
- Backup and recovery procedures

## Database Migration

### Schema Management
```sql
-- Initial schema
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bitcoin_address VARCHAR(255),
    lightning_address VARCHAR(255),
    last_claim TIMESTAMP,
    total_claims INT DEFAULT 0,
    useless_tokens INT DEFAULT 0
);

CREATE TABLE claims (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    amount_satoshis INT,
    transaction_id VARCHAR(255),
    status ENUM('pending', 'completed', 'failed'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Monitoring and Analytics

### System Monitoring
- Docker container health checks
- Database performance monitoring
- Lightning node status
- Server resource usage

### Application Analytics
- Faucet claim statistics
- User engagement metrics
- Useless Token distribution
- Revenue impact tracking

## Backup Strategy

### Automated Backups
```bash
#!/bin/bash
# Daily database backup
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > /backup/roflfaucet_$(date +%Y%m%d).sql

# Lightning wallet backup
lncli exportchanbackup --all --output_file /backup/channels_$(date +%Y%m%d).backup
```

### Recovery Procedures
1. Database restoration from backup
2. Lightning channel recovery
3. Application container restart
4. DNS failover if needed

## Integration with Main Platform

### API Endpoints
- User authentication sync
- Useless Token balance updates
- Charity voting integration
- Cross-platform analytics

### Single Sign-On (SSO)
- JWT token sharing
- Session management
- User profile synchronization

## Cost Estimation

### Actual Hosting Costs (Shared VPS)
- **Server**: $25/year (shared with Listmonk - incredible value!)
- **Domain**: $12/year for roflfaucet.com
- **SSL**: Free (Let's Encrypt)
- **Total**: ~$37/year for professional faucet hosting

### Migration Costs (if needed later)
- **Dedicated ROFLFaucet VPS**: $60-180/year
- **Dedicated Listmonk VPS**: $60-180/year

### Scaling Considerations
- Traffic growth handling
- Database optimization
- Lightning liquidity management
- CDN for static assets

This deployment strategy ensures a professional, secure, and scalable launch for roflfaucet.com while maintaining integration with the clickforcharity.net ecosystem.

