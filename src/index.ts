import { FourmemeService } from './services/fourmeme';
import { PancakeSwapService } from './services/pancakeswap';
import { SignalGenerator } from './services/signal-generator';
import { Config } from './config';
import { logger } from './utils/logger';
import { Position, TradeSignal } from './types';
import { ethers } from 'ethers';

class VolumeBot {
  private fourmemeService: FourmemeService;
  private pancakeSwapService: PancakeSwapService;
  private signalGenerator: SignalGenerator;
  private positions: Map<string, Position> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.fourmemeService = new FourmemeService();
    this.pancakeSwapService = new PancakeSwapService();
    this.signalGenerator = new SignalGenerator();
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting BNB Volume Bot...');

    // Validate configuration
    if (!Config.wallet.privateKey) {
      logger.error('Private key not configured');
      process.exit(1);
    }

    logger.info(`Bot wallet: ${this.pancakeSwapService.getAddress()}`);
    
    // Start main loop
    this.mainLoop();
  }

  /**
   * Main trading loop
   */
  private async mainLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        logger.info('Starting trading cycle...');

        // 1. Check existing positions
        await this.checkPositions();

        // 2. Get new trading opportunities
        const opportunities = await this.getOpportunities();

        // 3. Execute trades
        await this.executeTrades(opportunities);

        // Log current positions
        logger.info(`Active positions: ${this.positions.size}`);

        // Wait before next cycle
        await this.sleep(Config.bot.checkIntervalSeconds * 1000);
      } catch (error: any) {
        logger.error('Error in main loop:', {
          message: error.message,
          stack: error.stack,
        });
        await this.sleep(5000);
      }
    }
  }

  /**
   * Get trading opportunities from Fourmeme
   */
  private async getOpportunities(): Promise<TradeSignal[]> {
    logger.info('Fetching trading opportunities...');

    const pairs = await this.fourmemeService.getTradingPairs();
    
    // Filter by minimum criteria
    const minLiquidity = BigInt('10000000000000000000000'); // 10K
    const minVolume = BigInt('5000000000000000000000'); // 5K

    const filteredPairs = this.fourmemeService.filterByCriteria(
      pairs,
      minLiquidity,
      minVolume
    );

    logger.info(`Found ${filteredPairs.length} qualified trading pairs`);

    // Generate buy signals
    return this.signalGenerator.generateBuySignals(filteredPairs);
  }

  /**
   * Execute trades based on signals
   */
  private async executeTrades(signals: TradeSignal[]): Promise<void> {
    if (signals.length === 0) {
      return;
    }

    // Get available balance
    const balance = await this.pancakeSwapService.getBNBBalance();
    const balanceBNB = parseFloat(ethers.formatEther(balance));

    logger.info(`Available balance: ${balanceBNB.toFixed(4)} BNB`);

    // Only take top signals to avoid over-leveraging
    const topSignals = signals.slice(0, 3);

    for (const signal of topSignals) {
      // Skip if already have position in this token
      if (this.positions.has(signal.pair.token.address)) {
        continue;
      }

      // Skip if balance is too low
      if (balanceBNB < Config.trading.minBuyAmountBNB) {
        logger.warn('Balance too low for trading');
        break;
      }

      // Calculate position size
      const positionSize = this.signalGenerator.calculatePositionSize(
        signal.confidence,
        balanceBNB
      );

      logger.info(`Executing buy signal for ${signal.pair.token.symbol}`, {
        confidence: signal.confidence.toFixed(2),
        positionSize: positionSize.toFixed(4),
        entryPrice: signal.entryPrice,
      });

      // Execute buy
      const success = await this.pancakeSwapService.buyToken(
        signal.pair.token.address,
        positionSize
      );

      if (success) {
        // Record position
        const tokenBalance = await this.pancakeSwapService.getBalance(
          signal.pair.token.address
        );

        const position: Position = {
          token: signal.pair.token,
          entryPrice: signal.entryPrice,
          amount: tokenBalance,
          timestamp: Date.now(),
          type: 'LONG',
          targetPrice: signal.targetPrice,
          stopLoss: signal.stopLoss,
        };

        this.positions.set(signal.pair.token.address, position);
        logger.info(`Position opened for ${signal.pair.token.symbol}`);

        // Wait between trades
        await this.sleep(2000);
      }
    }
  }

  /**
   * Check and manage existing positions
   */
  private async checkPositions(): Promise<void> {
    if (this.positions.size === 0) {
      return;
    }

    logger.info(`Checking ${this.positions.size} positions...`);

    const positionsToClose: string[] = [];

    for (const [tokenAddress, position] of this.positions.entries()) {
      try {
        // Get current price
        const currentPrice = await this.pancakeSwapService.getPrice(
          tokenAddress
        );

        if (currentPrice === 0) {
          logger.warn(`Could not get price for ${position.token.symbol}`);
          continue;
        }

        // Check if should sell
        if (this.signalGenerator.shouldSellPosition(position, currentPrice)) {
          positionsToClose.push(tokenAddress);
        } else {
          const priceChange = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
          logger.info(
            `Position ${position.token.symbol}: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`,
            {
              currentPrice,
              entryPrice: position.entryPrice,
            }
          );
        }
      } catch (error: any) {
        logger.error(`Error checking position ${position.token.symbol}:`, {
          message: error.message,
        });
      }
    }

    // Close positions
    for (const tokenAddress of positionsToClose) {
      const position = this.positions.get(tokenAddress)!;
      await this.closePosition(position);
    }
  }

  /**
   * Close a position
   */
  private async closePosition(position: Position): Promise<void> {
    logger.info(`Closing position for ${position.token.symbol}...`);

    const tokenBalance = await this.pancakeSwapService.getBalance(
      position.token.address
    );

    if (tokenBalance > BigInt(0)) {
      const success = await this.pancakeSwapService.sellToken(
        position.token.address,
        tokenBalance
      );

      if (success) {
        this.positions.delete(position.token.address);
        logger.info(`Position closed for ${position.token.symbol}`);
      }
    } else {
      logger.warn(`No balance to close for ${position.token.symbol}`);
      this.positions.delete(position.token.address);
    }
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    logger.info('Stopping bot...');
    this.isRunning = false;

    // Close all positions
    for (const [tokenAddress, position] of this.positions.entries()) {
      await this.closePosition(position);
    }

    logger.info('Bot stopped');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Start bot
const bot = new VolumeBot();
bot.start().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down...');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down...');
  await bot.stop();
  process.exit(0);
});
