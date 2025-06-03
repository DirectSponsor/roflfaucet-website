# ROFLFaucet

**A humorous Useless Token faucet system for clickforcharity.net**

## Overview

ROFLFaucet is a Useless Token faucet designed to integrate with the clickforcharity.net platform, providing users with free Useless Tokens for gamification and charity voting. The name combines "ROFL" (Rolling On the Floor Laughing) with "faucet" to emphasize the fun, community-driven nature of the platform.

## Features

- **Free Useless Tokens** dispensed to users for engagement
- **Gamification system** with achievements and leaderboards
- **Charity voting power** - tokens influence revenue allocation
- **Anti-bot protection** with various verification methods
- **Timer-based claims** to prevent abuse
- **Admin dashboard** for faucet management
- **API endpoints** for integration with main platform
- **Responsive design** for mobile and desktop

## Technical Stack

- **Backend**: Node.js/Express or PHP (TBD)
- **Database**: MySQL/PostgreSQL for user accounts and token balances
- **Frontend**: HTML5, CSS3, JavaScript (responsive design)
- **Token System**: Database-backed Useless Token management
- **Docker**: Containerized deployment

## Integration Points

### With Main Platform
- User authentication sync
- Useless Token reward system
- Charity allocation voting
- Profile integration

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
- Anti-bot protection settings

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
- [ ] Timer system (hourly/daily claims)
- [ ] Simple captcha protection
- [ ] User account integration

### Phase 2: Gamification Features
- [ ] Achievement system
- [ ] Leaderboards
- [ ] Bonus multipliers
- [ ] Streak rewards

### Phase 3: Platform Integration
- [ ] User authentication sync with main platform
- [ ] Token balance synchronization
- [ ] Charity voting integration
- [ ] Cross-platform analytics

### Phase 4: Advanced Features
- [ ] Advanced anti-bot protection
- [ ] Admin dashboard
- [ ] Mobile-responsive design
- [ ] Social sharing features

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

