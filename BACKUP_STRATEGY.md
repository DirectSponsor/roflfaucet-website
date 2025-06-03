# Comprehensive Backup Strategy

## Backup Infrastructure

### Primary Server (Production)
**ES7 (rngksxzy) - 89.116.44.206**
- **Services**: Listmonk + ROFLFaucet
- **Specs**: 3GB RAM, 1 Core, 100GB disk
- **Cost**: $25/year
- **Backup needs**: Databases, application data, configurations

### Backup Server (Storage)
**Servarica 1 - 209.209.10.41**
- **Hostname**: storage01
- **Specs**: 1GB RAM, 1 vCPU, 1TB HDD RAIDz2
- **Bandwidth**: 4TB transfer on 1Gb/s
- **Cost**: $29/year
- **Purpose**: Centralized backup storage for all servers
- **Access**: SSH/SFTP (WebDAV broken after SSL attempt)

## Backup Strategy Overview

### What to Backup
1. **Listmonk Data**
   - PostgreSQL database
   - Configuration files
   - Email templates
   - Upload files

2. **ROFLFaucet Data**
   - MySQL/PostgreSQL database (user tokens)
   - Configuration files
   - Application logs
   - Static assets

3. **System Configuration**
   - Nginx configurations
   - SSL certificates
   - Docker compose files
   - Environment files

### Backup Methods

#### Method 1: SFTP + rsync (Recommended)
```bash
#!/bin/bash
# /home/backup/backup-script.sh

BACKUP_SERVER="209.209.10.41"
BACKUP_USER="backup_user"  # To be created
BACKUP_PATH="/backup/es7"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p /tmp/backup/$DATE

# Backup Listmonk database
docker exec listmonk_db pg_dump -U listmonk listmonk > /tmp/backup/$DATE/listmonk_db.sql

# Backup ROFLFaucet database  
mysqldump -u roflfaucet_user -p$DB_PASSWORD roflfaucet > /tmp/backup/$DATE/roflfaucet_db.sql

# Backup configuration files
cp -r /home/listmonk/ /tmp/backup/$DATE/listmonk_config/
cp -r /home/roflfaucet/ /tmp/backup/$DATE/roflfaucet_config/

# Backup nginx configs
cp -r /etc/nginx/sites-available/ /tmp/backup/$DATE/nginx_configs/

# Sync to backup server
rsync -avz --delete /tmp/backup/$DATE/ $BACKUP_USER@$BACKUP_SERVER:$BACKUP_PATH/$DATE/

# Clean up local backup
rm -rf /tmp/backup/$DATE

# Keep only last 30 days on backup server
ssh $BACKUP_USER@$BACKUP_SERVER "find $BACKUP_PATH -type d -mtime +30 -exec rm -rf {} +"
```

#### Method 2: Direct Database Streaming
```bash
# Stream database directly to backup server
docker exec listmonk_db pg_dump -U listmonk listmonk | \
ssh $BACKUP_USER@$BACKUP_SERVER "cat > $BACKUP_PATH/listmonk_$(date +%Y%m%d).sql"
```

## Setup Tasks (Future Implementation)

### On Backup Server (209.209.10.41)
1. **Create backup user**
   ```bash
   sudo adduser backup_user
   sudo mkdir -p /backup/es7
   sudo chown backup_user:backup_user /backup/es7
   ```

2. **SSH key setup**
   ```bash
   # Generate key on production server
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/backup_key
   
   # Copy public key to backup server
   ssh-copy-id -i ~/.ssh/backup_key.pub backup_user@209.209.10.41
   ```

3. **Fix WebDAV SSL issue** (Optional)
   - Investigate SSL configuration problem
   - Alternative: Use SFTP/rsync instead (simpler and more reliable)

### On Production Server (89.116.44.206)
1. **Install backup script**
   ```bash
   sudo mkdir -p /home/backup
   sudo nano /home/backup/backup-script.sh
   sudo chmod +x /home/backup/backup-script.sh
   ```

2. **Setup cron job**
   ```bash
   # Daily backup at 2 AM
   0 2 * * * /home/backup/backup-script.sh >> /var/log/backup.log 2>&1
   ```

3. **Configure log rotation**
   ```bash
   # /etc/logrotate.d/backup
   /var/log/backup.log {
       daily
       missingok
       rotate 30
       compress
       notifempty
   }
   ```

## Backup Schedule

### Daily Backups (2 AM UTC)
- Complete database dumps
- Configuration files
- Application data
- Automated cleanup (keep 30 days)

### Weekly Backups (Sunday 3 AM UTC)
- Full system snapshot
- Docker images
- SSL certificates
- Complete nginx configuration

### Monthly Backups (1st of month, 4 AM UTC)
- Archive previous month
- Compress older backups
- Generate backup report
- Test restore procedures

## Monitoring and Alerts

### Backup Verification
```bash
#!/bin/bash
# Check if backup completed successfully
BACKUP_LOG="/var/log/backup.log"
LAST_BACKUP=$(tail -n 1 $BACKUP_LOG)

if [[ $LAST_BACKUP == *"SUCCESS"* ]]; then
    echo "Backup completed successfully"
else
    echo "Backup failed - check logs"
    # Send alert email/notification
fi
```

### Storage Monitoring
```bash
# Check backup server disk usage
ssh backup_user@209.209.10.41 "df -h /backup"

# Alert if > 80% full
USAGE=$(ssh backup_user@209.209.10.41 "df /backup | tail -1 | awk '{print \$5}' | sed 's/%//g'")
if [ $USAGE -gt 80 ]; then
    echo "Warning: Backup storage $USAGE% full"
fi
```

## Disaster Recovery Procedures

### Complete Server Restore
1. **Provision new VPS** with same specs
2. **Install base system** (Docker, nginx, etc.)
3. **Restore databases** from latest backup
4. **Restore configurations** and SSL certificates
5. **Update DNS** to point to new server
6. **Verify services** are running correctly

### Partial Service Restore
1. **Stop affected service**
2. **Download specific backup** from storage server
3. **Restore database/files** as needed
4. **Restart service** and verify

## Cost Summary

### Backup Infrastructure Costs
- **Production VPS**: $25/year (ES7)
- **Backup Server**: $29/year (Servarica)
- **Total**: $54/year for production + backup
- **Storage capacity**: 1TB (plenty for databases and configs)
- **Bandwidth**: 4TB/month (more than sufficient)

### Value Proposition
- **Professional backup strategy** for $29/year
- **1TB storage** for all server backups
- **Automated daily backups** with 30-day retention
- **Disaster recovery capability**
- **Peace of mind** for critical services

## Implementation Priority

### Phase 1 (Immediate)
1. Set up SSH key authentication
2. Create basic backup script
3. Test manual backup/restore

### Phase 2 (After ROFLFaucet deployment)
1. Add ROFLFaucet to backup script
2. Set up automated cron jobs
3. Configure monitoring

### Phase 3 (Ongoing)
1. Regular backup testing
2. Storage optimization
3. Enhanced monitoring/alerting

This backup strategy provides enterprise-level data protection at a fraction of the cost, leveraging your existing 1TB storage server investment.

