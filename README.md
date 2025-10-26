# BNB Volume Bot

Automated trading bot for BNB Chain (BSC) that monitors high-volume tokens on Fourmeme and executes trades on PancakeSwap based on volume, liquidity, and momentum indicators.

## Features

- 🤖 **Automated Trading**: Executes buy/sell orders based on signal analysis
- 📊 **Volume Analysis**: Filters tokens by 24h volume and liquidity
- 🎯 **Risk Management**: Built-in stop-loss and take-profit mechanisms
- 🔄 **Multi-Token Support**: Tracks and manages multiple positions simultaneously
- 📈 **Signal Generation**: AI-driven trading signals with confidence scoring
- 🔔 **Comprehensive Logging**: Detailed logs with rotation for monitoring

## Prerequisites

- Node.js >= 18.x
- npm or yarn
- Private key for BNB wallet with BNB balance
- (Optional) Fourmeme API key

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your settings
```

## Configuration

Edit the `.env` file with your configuration:

```env
# Required
PRIVATE_KEY=your_wallet_private_key

# RPC URL (default: BSC mainnet)
RPC_URL=https://bsc-dataseed.binance.org

# Trading Parameters
SLIPPAGE=5                    # Slippage tolerance percentage
GAS_PRICE_GWEI=5              # Gas price in Gwei
MIN_BUY_AMOUNT_BNB=0.01       # Minimum buy amount
MAX_BUY_AMOUNT_BNB=1.0        # Maximum buy amount
TAKE_PROFIT_PERCENT=10        # Take profit at +X%
STOP_LOSS_PERCENT=5           # Stop loss at -X%

# Bot Settings
CHECK_INTERVAL_SECONDS=60     # Trading cycle interval
MAX_POSITION_SIZE_USD=1000    # Maximum position size

# Optional: Fourmeme API
FOURMEME_API_KEY=your_api_key
```

## Usage

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start

# Watch mode (auto-rebuild on changes)
npm run watch
```

## How It Works

### Trading Strategy

1. **Token Discovery**: Fetches trending tokens from Fourmeme
2. **Filtering**: Filters tokens by minimum liquidity ($10K+) and volume ($5K+)
3. **Signal Generation**: Calculates buy signals based on:
   - Volume score (40% weight)
   - Liquidity score (30% weight)
   - Price momentum (30% weight)
4. **Risk Management**: 
   - Position sizing based on confidence score
   - Automatic take-profit at +10%
   - Stop-loss at -5%
   - Emergency sell at -15% drop

### Signal Confidence Scoring

The bot assigns confidence scores (0-1) to each signal:

```
Confidence = (Volume Score × 0.4) + (Liquidity Score × 0.3) + (Momentum Score × 0.3)
```

Only signals with confidence > 0.6 are executed.

## Architecture

```
src/
├── index.ts                 # Main bot entry point
├── config.ts                # Configuration management
├── types.ts                 # TypeScript type definitions
├── services/
│   ├── fourmeme.ts         # Fourmeme API integration
│   ├── pancakeswap.ts      # PancakeSwap DEX integration
│   └── signal-generator.ts # Trading signal generation
└── utils/
    └── logger.ts           # Logging utility
```

## Monitoring

Logs are stored in the `logs/` directory with daily rotation:

```bash
logs/
├── bot-2024-01-01.log     # Daily logs
├── exceptions.log         # Exception logs
└── rejections.log         # Rejection logs
```

## Risk Warning

⚠️ **This bot trades real funds on the blockchain.** 

- Start with small amounts to test
- Monitor the bot regularly
- Never share your private key
- Be aware of potential smart contract risks
- Gas fees will be incurred on every transaction

## License

MIT

## Support

For issues and questions:
1. Check the logs in `logs/` directory
2. Review configuration in `.env`
3. Ensure wallet has sufficient BNB for gas

## Contributing

Contributions are welcome! Please ensure:
- Code follows TypeScript best practices
- All new features include tests
- Documentation is updated
