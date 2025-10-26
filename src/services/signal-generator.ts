import { logger } from '../utils/logger';
import { Config } from '../config';
import { TradingPair, TradeSignal, Position } from '../types';

export class SignalGenerator {
  /**
   * Generate buy signals based on trading pair data
   */
  generateBuySignals(pairs: TradingPair[]): TradeSignal[] {
    const signals: TradeSignal[] = [];

    for (const pair of pairs) {
      const confidence = this.calculateBuyConfidence(pair);
      
      if (confidence > 0.6) {
        signals.push({
          pair,
          action: 'BUY',
          entryPrice: pair.price,
          targetPrice: pair.price * (1 + Config.trading.takeProfitPercent / 100),
          stopLoss: pair.price * (1 - Config.trading.stopLossPercent / 100),
          confidence,
        });
      }
    }

    return signals.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Check if a position should be sold
   */
  shouldSellPosition(position: Position, currentPrice: number): boolean {
    if (position.targetPrice && currentPrice >= position.targetPrice) {
      logger.info(`Take profit triggered for ${position.token.symbol}`);
      return true;
    }

    if (position.stopLoss && currentPrice <= position.stopLoss) {
      logger.info(`Stop loss triggered for ${position.token.symbol}`);
      return true;
    }

    // Additional logic: sell if significant drop in price
    const priceChange = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    
    if (priceChange < -15) { // 15% drop
      logger.info(`Significant price drop detected for ${position.token.symbol}: ${priceChange.toFixed(2)}%`);
      return true;
    }

    return false;
  }

  /**
   * Calculate buy confidence score (0-1)
   */
  private calculateBuyConfidence(pair: TradingPair): number {
    let score = 0;

    // Volume criteria (40% weight)
    const volumeScore = this.calculateVolumeScore(pair.volume24h);
    score += volumeScore * 0.4;

    // Liquidity criteria (30% weight)
    const liquidityScore = this.calculateLiquidityScore(pair.liquidity);
    score += liquidityScore * 0.3;

    // Price momentum (30% weight)
    const momentumScore = this.calculateMomentumScore(pair.change24h);
    score += momentumScore * 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate volume score
   */
  private calculateVolumeScore(volume24h: bigint): number {
    // Check if volume is above average threshold
    const minVolume = BigInt('10000000000000000000000'); // 10K USD equivalent
    
    if (volume24h < minVolume) return 0;
    if (volume24h > minVolume * BigInt(10)) return 1;
    
    return Math.min(Number(volume24h) / Number(minVolume * BigInt(10)), 1);
  }

  /**
   * Calculate liquidity score
   */
  private calculateLiquidityScore(liquidity: bigint): number {
    const minLiquidity = BigInt('5000000000000000000000'); // 5K USD equivalent
    
    if (liquidity < minLiquidity) return 0;
    if (liquidity > minLiquidity * BigInt(10)) return 1;
    
    return Math.min(Number(liquidity) / Number(minLiquidity * BigInt(10)), 1);
  }

  /**
   * Calculate momentum score based on 24h change
   */
  private calculateMomentumScore(change24h: number): number {
    // Positive momentum is good, but too high might indicate pump
    if (change24h < 0) return 0;
    if (change24h > 100) return 0.5; // Too high, might be a pump
    if (change24h > 50) return 0.7;
    if (change24h > 10) return 1;
    
    return change24h / 10;
  }

  /**
   * Calculate position size based on confidence and available balance
   */
  calculatePositionSize(confidence: number, availableBalance: number): number {
    const maxPosition = Config.bot.maxPositionSizeUSD;
    const minPosition = Config.trading.minBuyAmountBNB;
    const maxPositionBNB = Config.trading.maxBuyAmountBNB;

    // Scale position size based on confidence
    const positionSize = Math.min(
      availableBalance * confidence,
      maxPositionBNB
    );

    return Math.max(Math.min(positionSize, availableBalance * 0.3), minPosition);
  }
}
