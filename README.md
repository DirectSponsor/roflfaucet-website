# ROFLFaucet

**A humorous Bitcoin faucet system for clickforcharity.net**

## Overview

ROFLFaucet is a Bitcoin faucet designed to integrate with the clickforcharity.net platform, providing users with small amounts of cryptocurrency while supporting charitable causes. The name combines "ROFL" (Rolling On the Floor Laughing) with "faucet" to emphasize the fun, community-driven nature of the platform.

## Features

- **Bitcoin Lightning Network** integration for instant, low-fee payouts
- **Useless Token** integration for gamification
- **Anti-bot protection** with various verification methods
- **Timer-based claims** to prevent abuse
- **Admin dashboard** for faucet management
- **API endpoints** for integration with main platform
- **Responsive design** for mobile and desktop

## Technical Stack

- **Backend**: Node.js/Express or PHP (TBD)
- **Database**: MySQL/PostgreSQL
- **Frontend**: HTML5, CSS3, JavaScript
- **Lightning**: LND/CLN integration
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
- Lightning Network settings
- Faucet parameters (amounts, timers, etc.)
- Anti-bot protection settings

## API Documentation

### Faucet Claims
```
POST /api/claim
{
  "address": "lightning_address_or_bitcoin_address",
  "captcha": "captcha_response",
  "user_token": "auth_token"
}
```

### User Statistics
```
GET /api/user/:id/stats
```

### Admin Functions
```
GET /api/admin/stats
POST /api/admin/settings
```

## Development Roadmap

### Phase 1: Core Faucet
- [ ] Basic faucet functionality
- [ ] Timer system
- [ ] Simple captcha protection
- [ ] Bitcoin address validation

### Phase 2: Lightning Integration
- [ ] Lightning Network payouts
- [ ] Invoice generation
- [ ] Payment verification

### Phase 3: Platform Integration
- [ ] User authentication sync
- [ ] Useless Token rewards
- [ ] Main site API integration

### Phase 4: Advanced Features
- [ ] Advanced anti-bot protection
- [ ] Admin dashboard
- [ ] Analytics and reporting
- [ ] Mobile app support

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

