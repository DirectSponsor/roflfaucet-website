# ROFLFaucet

**A humorous Useless Token faucet system for clickforcharity.net**

## Overview

ROFLFaucet is a Useless Token faucet designed to integrate with the clickforcharity.net platform, providing users with free Useless Tokens for gamification and charity voting. The name combines "ROFL" (Rolling On the Floor Laughing) with "faucet" to emphasize the fun, community-driven nature of the platform.

### 2025 Design Philosophy
**Humor-First + Democratic Charity Allocation + Multi-Revenue Streams**
- Differentiates from boring traditional faucets with curated funny content
- Users vote with tokens on charity funding (democratic revenue allocation)
- **Dual-platform video strategy**: YouTube for outreach + Odysee for decentralized ethos
- **hCaptcha integration**: Traditional faucet UX + additional revenue stream
- **Simplified development**: No complex video puzzles, just expected captcha

## Features

- **Free Useless Tokens** dispensed to users for engagement
- **Gamification system** with achievements and leaderboards
- **Democratic charity voting** - tokens = voting power for revenue allocation
- **Context-aware humor content** - funny GIFs and images based on user state
- **Dual-platform video strategy** - YouTube for reach + Odysee for decentralization
- **hCaptcha revenue stream** - traditional faucet UX + paid per solve
- **Timer-based claims** with patience-themed humor during cooldown
- **Admin dashboard** for faucet management
- **API endpoints** for integration with main platform
- **Responsive design** for mobile and desktop
- **Viral charity impact** - shareable stories of collective charitable impact

## Technical Stack

- **Backend**: Node.js/Express or PHP (TBD)
- **Database**: MySQL/PostgreSQL for user accounts and token balances
- **Frontend**: HTML5, CSS3, JavaScript (responsive design)
- **Token System**: Database-backed Useless Token management
- **Docker**: Containerized deployment

## 💰 **hCaptcha Revenue Model**

### Why hCaptcha is Perfect for Charitable Faucets

hCaptcha transforms the traditional "anti-bot" security step into a genuine revenue generator for charity:

**💵 Direct Revenue Generation:**
- Website owners earn $0.0001 to $0.001 per CAPTCHA solved
- Revenue scales automatically with user engagement
- Creates sustainable, predictable funding for charity projects
- No dependency on external donations or advertising

**🎯 Mission Alignment:**
- Every puzzle solved literally generates money for charity
- Users can be honestly told "solving this helps fund charity"
- Transforms security requirement into charitable action
- Higher platform traffic = more charity funding

**📈 Sustainable Growth:**
- Revenue grows naturally with platform popularity
- Creates positive feedback loop: better platform → more users → more charity funding
- Transparent funding model users can understand and support
- Incentivizes platform improvement and user retention

**🔧 Implementation Details:**
- **Site Key**: `10000000-ffff-ffff-ffff-000000000001` (test key)
- **Secret Key**: `0x0000000000000000000000000000000000000000` (test key)
- **Production**: Requires real hCaptcha account for revenue generation
- **Integration**: Frontend widget + backend verification
- **Revenue Tracking**: Monitor earnings for transparent charity allocation

**⚠️ Development Safety Guidelines:**
- **Testing with Real Keys**: Only test real hCaptcha keys once to verify integration
- **Development Mode**: Use test tokens (`test_token_*`) for ongoing development
- **Avoid Localhost Abuse**: Extended testing on localhost may flag unusual activity
- **Production Deployment**: Only use real keys continuously on live domains
- **Safe Switching**: Backend accepts both real tokens and test tokens during development

## Integration Points

### "Sign in with ClickForCharity" Authentication
- OAuth-style authentication system
- Single registration at ClickForCharity.net
- Seamless access across all services
- Unified user profiles and preferences
- Cross-platform UselessCoin balance

### With Main Platform
- User authentication via OAuth tokens
- Useless Token reward system synchronization
- Charity allocation voting integration
- Profile data synchronization

### With Useless Token System
- Award tokens for faucet claims
- Token-based bonus multipliers
- Special rewards for token holders

## Getting Started

```bash
# Clone the repository
git clone https://github.com/andysavage/clickforcharity-roflfaucet.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run development server
npm run dev
```

## Configuration

See `config/` directory for:
- Database configuration
- Useless Token distribution settings
- Faucet parameters (token amounts, timers, etc.)
- **hCaptcha integration** (site key, secret key, revenue tracking)
- Content management settings (humor selection algorithms)
- **Dual-platform video configuration** (YouTube + Odysee)
- Charity voting system parameters

## API Documentation

### Faucet Claims
```
POST /api/claim
{
  "user_id": "authenticated_user_id",
  "captcha": "captcha_response"
}

Response:
{
  "success": true,
  "tokens_awarded": 50,
  "next_claim_time": "2024-01-01T12:00:00Z",
  "total_balance": 1250
}
```

### User Statistics
```
GET /api/user/:id/stats

Response:
{
  "total_tokens": 1250,
  "total_claims": 25,
  "last_claim": "2024-01-01T11:00:00Z",
  "next_claim_available": "2024-01-01T12:00:00Z"
}
```

### Admin Functions
```
GET /api/admin/stats
POST /api/admin/settings
```

## Development Roadmap

### Phase 1: Core Token Faucet
- [ ] Basic Useless Token dispensing
- [ ] **hCaptcha integration** (traditional UX + revenue)
- [ ] Timer system (hourly/daily claims)
- [ ] Random humor content integration
- [ ] User account integration
- [ ] Context-aware content selection

### Phase 2: Content & Engagement
- [ ] **Dual-platform video integration** (YouTube + Odysee)
- [ ] Advanced humor content management
- [ ] Cross-platform video promotion
- [ ] Achievement system
- [ ] Leaderboards
- [ ] Bonus multipliers
- [ ] Streak rewards

### Phase 3: Democratic Charity Features
- [ ] User authentication sync with main platform
- [ ] Token balance synchronization
- [ ] Charity voting system integration
- [ ] Democratic revenue allocation
- [ ] Impact sharing and viral features
- [ ] Cross-platform analytics

### Phase 4: Advanced Features
- [ ] Advanced content curation
- [ ] Admin dashboard
- [ ] Mobile-responsive design
- [ ] Social sharing features
- [ ] Traffic analytics and optimization
- [ ] Video content management

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Related Projects

- [clickforcharity-social-media-extension](https://github.com/andysavage/clickforcharity-social-media-extension) - Main platform
- [clickforcharity-useless-token](https://github.com/andysavage/clickforcharity-useless-token) - Token system (planned)

## Live Site

🌐 **Visit**: [roflfaucet.com](https://roflfaucet.com)

*Currently showing "Coming Sometime..." - this repository contains the development code for the upcoming faucet system.*

## Support

For support and questions:
- GitHub Issues: [Report bugs or request features](https://github.com/andysavage/clickforcharity-roflfaucet/issues)
- Main project wiki: [nimno.net documentation](https://nimno.net/sites/clickforcharity-net/)
- Live site: [roflfaucet.com](https://roflfaucet.com)
- Community: [Join our discussions](https://clickforcharity.net/community)

