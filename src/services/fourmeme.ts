import axios, { AxiosInstance } from 'axios';
import { Config } from '../config';
import { logger } from '../utils/logger';
import { FourmemeTokenData, TradingPair, Token } from '../types';

export class FourmemeService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = Config.fourmeme.apiKey;
    this.client = axios.create({
      baseURL: Config.fourmeme.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'X-API-Key': this.apiKey }),
      },
    });
  }

  /**
   * Fetch trending tokens from Fourmeme
   */
  async getTrendingTokens(limit: number = 50): Promise<FourmemeTokenData[]> {
    try {
      logger.info(`Fetching trending tokens from Fourmeme (limit: ${limit})`);
      
      const response = await this.client.get('/tokens/trending', {
        params: { limit },
      });

      return response.data.tokens || [];
    } catch (error: any) {
      logger.error('Error fetching trending tokens from Fourmeme:', {
        message: error.message,
        stack: error.stack,
      });
      return [];
    }
  }

  /**
   * Get token details by address
   */
  async getTokenDetails(tokenAddress: string): Promise<FourmemeTokenData | null> {
    try {
      logger.info(`Fetching token details for ${tokenAddress}`);
      
      const response = await this.client.get(`/tokens/${tokenAddress}`);
      return response.data;
    } catch (error: any) {
      logger.error(`Error fetching token details for ${tokenAddress}:`, {
        message: error.message,
      });
      return null;
    }
  }

  /**
   * Get trading pairs with volume data
   */
  async getTradingPairs(): Promise<TradingPair[]> {
    try {
      const tokens = await this.getTrendingTokens(100);
      
      return tokens.map((token) => ({
        token: {
          address: token.tokenAddress,
          symbol: token.symbol,
          name: token.name,
          decimals: 18,
        },
        liquidity: BigInt(token.liquidity || '0'),
        volume24h: BigInt(token.volume24h || '0'),
        price: parseFloat(token.price || '0'),
        change24h: parseFloat(token.priceChange24h || '0'),
      }));
    } catch (error: any) {
      logger.error('Error getting trading pairs:', { message: error.message });
      return [];
    }
  }

  /**
   * Filter tokens by minimum liquidity and volume
   */
  filterByCriteria(
    pairs: TradingPair[],
    minLiquidity: bigint,
    minVolume: bigint
  ): TradingPair[] {
    return pairs.filter((pair) => {
      const hasLiquidity = pair.liquidity >= minLiquidity;
      const hasVolume = pair.volume24h >= minVolume;
      return hasLiquidity && hasVolume;
    });
  }
}
