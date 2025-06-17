# "Sign in with ClickForCharity" Authentication System

## Overview

Instead of managing separate user accounts across multiple sites (ROFLFaucet, future projects), we'll create a centralized OAuth-style authentication system where ClickForCharity.net acts as the identity provider.

**User Experience**: Users register once at ClickForCharity.net, then can seamlessly access ROFLFaucet and any future projects with a simple "Sign in with ClickForCharity" button.

## Benefits

### For Users
- **Single Registration**: Only need to sign up once at ClickForCharity.net
- **No Password Management**: Don't need to remember multiple passwords
- **Seamless Experience**: One-click access to all our services
- **Unified Profile**: Same identity across all platforms
- **Privacy Control**: Can revoke access to individual services

### For Development
- **Centralized User Management**: All user data in one place
- **Simplified Authentication**: No need to rebuild auth for each project
- **Security**: Single point of security maintenance
- **Data Consistency**: User preferences sync across services
- **Analytics**: Unified user journey tracking

### For Business
- **Increased Engagement**: Easier for users to try new services
- **Better Analytics**: Complete user behavior across ecosystem
- **Unified Branding**: All services feel connected
- **Reduced Support**: Fewer password reset requests

## Technical Implementation

### OAuth 2.0 Flow

1. **User visits ROFLFaucet.com**
2. **Clicks "Sign in with ClickForCharity"**
3. **Redirected to ClickForCharity.net/oauth/authorize**
4. **User logs in (if not already logged in)**
5. **User grants permission** to ROFLFaucet
6. **Redirected back to ROFLFaucet** with authorization code
7. **ROFLFaucet exchanges code for access token**
8. **ROFLFaucet can now access user's permitted data**

### Required Components

#### ClickForCharity.net (OAuth Provider)
- **OAuth Authorization Server**
- **User Consent Interface**
- **Application Registration System**
- **Token Management**
- **User Profile API**

#### ROFLFaucet.com (OAuth Client)
- **OAuth Client Library**
- **Authorization Callback Handler**
- **Token Storage/Management**
- **User Session Management**

### Database Schema

#### ClickForCharity.net
```sql
-- OAuth Applications
CREATE TABLE oauth_clients (
    client_id VARCHAR(80) PRIMARY KEY,
    client_secret VARCHAR(80),
    name VARCHAR(255),
    description TEXT,
    redirect_uri TEXT,
    created_at TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

-- Authorization Codes
CREATE TABLE oauth_authorization_codes (
    code VARCHAR(128) PRIMARY KEY,
    client_id VARCHAR(80),
    user_id INT,
    expires_at TIMESTAMP,
    scope TEXT,
    redirect_uri TEXT
);

-- Access Tokens
CREATE TABLE oauth_access_tokens (
    token VARCHAR(128) PRIMARY KEY,
    client_id VARCHAR(80),
    user_id INT,
    expires_at TIMESTAMP,
    scope TEXT,
    created_at TIMESTAMP
);

-- User Consents
CREATE TABLE oauth_user_consents (
    user_id INT,
    client_id VARCHAR(80),
    scope TEXT,
    granted_at TIMESTAMP,
    PRIMARY KEY (user_id, client_id)
);
```

#### ROFLFaucet.com
```sql
-- User Sessions
CREATE TABLE user_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    clickforcharity_user_id INT,
    access_token VARCHAR(128),
    refresh_token VARCHAR(128),
    expires_at TIMESTAMP,
    created_at TIMESTAMP,
    last_active TIMESTAMP
);

-- User Data Cache
CREATE TABLE user_profiles (
    clickforcharity_user_id INT PRIMARY KEY,
    username VARCHAR(255),
    email VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url TEXT,
    useless_coin_balance INT DEFAULT 0,
    last_updated TIMESTAMP
);
```

### API Endpoints

#### ClickForCharity.net OAuth Endpoints

```
GET  /oauth/authorize          # Authorization endpoint
POST /oauth/token              # Token endpoint
GET  /oauth/userinfo           # User info endpoint
POST /oauth/revoke             # Token revocation
GET  /oauth/applications       # User's authorized apps
```

#### User Profile API

```
GET  /api/v1/user/profile      # Basic profile info
GET  /api/v1/user/preferences  # User preferences
POST /api/v1/user/preferences  # Update preferences
GET  /api/v1/user/coins        # UselessCoin balance
POST /api/v1/user/coins        # Update coin balance
```

### Scopes and Permissions

#### Available Scopes
- **profile**: Basic profile info (username, display name)
- **email**: Email address
- **coins**: UselessCoin balance and transactions
- **preferences**: User preferences and settings
- **charity_votes**: Charity voting history and preferences

#### ROFLFaucet Required Scopes
- **profile**: For displaying username
- **coins**: For managing UselessCoin balance
- **charity_votes**: For allocation preferences

### Security Considerations

#### Token Security
- **Short-lived access tokens** (1 hour)
- **Refresh tokens** for seamless renewal
- **HTTPS only** for all OAuth communications
- **State parameter** to prevent CSRF attacks
- **PKCE** (Proof Key for Code Exchange) for additional security

#### Data Protection
- **Minimal data sharing**: Only requested scopes
- **User consent**: Clear permission requests
- **Token revocation**: Users can revoke access anytime
- **Audit logging**: Track all authentication events

### WordPress Implementation Considerations

#### WordPress Limitations
- **Plugin Ecosystem**: Must work within WordPress plugin architecture
- **Database Access**: Limited to WordPress tables or custom plugin tables
- **URL Structure**: Must work with WordPress routing/permalinks
- **Security**: WordPress security model and plugin guidelines
- **Updates**: Must survive WordPress and plugin updates

#### WordPress OAuth Solutions

**Option 1: WordPress OAuth Plugin**
- Use existing plugins like "OAuth Server" or "WP OAuth Server"
- Pros: Faster implementation, maintained by community
- Cons: Limited customization, potential plugin conflicts

**Option 2: Custom WordPress Plugin**
- Build custom OAuth provider plugin for ClickForCharity.net
- Pros: Full control, integrated with WordPress users
- Cons: More development time, ongoing maintenance

**Option 3: External OAuth Service**
- Use Auth0, Firebase Auth, or similar service
- Pros: Enterprise-grade, no WordPress limitations
- Cons: Monthly costs, external dependency

**Option 4: Hybrid Approach (Recommended)**
- Simple WordPress plugin for user management
- External OAuth server (Node.js) that integrates with WordPress
- Pros: Best of both worlds, scalable
- Cons: More complex architecture

### Revised Implementation Strategy

#### Phase 1: Research & Planning (1-2 weeks)
1. Evaluate WordPress OAuth plugins
2. Test WordPress database integration options
3. Plan WordPress-compatible architecture
4. Choose implementation approach
5. Create WordPress development environment

#### Phase 2: WordPress Integration (3-4 weeks)
1. Set up WordPress OAuth capability
2. Create user sync mechanism
3. Build basic authorization interface
4. Test with WordPress user system
5. Handle WordPress-specific edge cases

#### Phase 2: ROFLFaucet Integration (1-2 weeks)
1. Install OAuth client library on ROFLFaucet
2. Implement "Sign in with ClickForCharity" button
3. Handle authorization callback
4. Create user session management
5. Test complete authentication flow

#### Phase 3: ROFLFaucet Integration (2-3 weeks)
1. Install OAuth client library on ROFLFaucet
2. Implement "Sign in with ClickForCharity" button
3. Handle WordPress OAuth responses
4. Create user session management
5. Test complete authentication flow

#### Phase 4: Enhanced Features (3-4 weeks)
1. WordPress user profile API integration
2. UselessCoin balance synchronization
3. WordPress user preferences sync
4. Plugin management interface
5. Token refresh automation

#### Phase 5: Security & Polish (1-2 weeks)
1. WordPress security audit and testing
2. Plugin compatibility testing
3. Error handling and user feedback
4. Performance optimization
5. Documentation for future clients

### Future Applications

Once the OAuth system is established, adding new services becomes trivial:

- **ClickForCharity Mobile App**
- **Charity Project Management Portal**
- **Volunteer Coordination System**
- **Analytics Dashboard**
- **Third-party integrations**

Each new application just needs to:
1. Register as OAuth client
2. Implement OAuth flow
3. Request appropriate scopes

### User Journey Example

1. **New User**:
   - Visits ROFLFaucet.com
   - Clicks "Sign in with ClickForCharity"
   - Redirected to ClickForCharity.net
   - Creates account there
   - Grants permission to ROFLFaucet
   - Back to ROFLFaucet, fully authenticated

2. **Existing User**:
   - Visits ROFLFaucet.com
   - Clicks "Sign in with ClickForCharity"
   - Already logged in to ClickForCharity
   - Instant redirect back to ROFLFaucet
   - Seamlessly authenticated

### Benefits for UselessCoin System

- **Unified Coin Balance**: Same coins across all platforms
- **Cross-platform Earning**: Earn coins on one site, spend on another
- **Centralized Charity Voting**: All allocation in one place
- **Consistent User Experience**: Same coin mechanics everywhere

---

**This OAuth system positions ClickForCharity.net as the central hub of our ecosystem, making it easy to launch new services while maintaining a seamless user experience.**

