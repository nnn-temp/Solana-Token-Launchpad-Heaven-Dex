export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface TradingPair {
  token: Token;
  liquidity: bigint;
  volume24h: bigint;
  price: number;
  change24h: number;
}

export interface TradeSignal {
  pair: TradingPair;
  action: 'BUY' | 'SELL';
  entryPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  confidence: number;
}

export interface Position {
  token: Token;
  entryPrice: number;
  amount: bigint;
  timestamp: number;
  type: 'LONG' | 'SHORT';
  targetPrice?: number;
  stopLoss?: number;
}

export interface VolumeData {
  timestamp: number;
  volume24h: string;
  liquidity: string;
  holders: number;
  transactions24h: number;
}

export interface FourmemeTokenData {
  tokenAddress: string;
  symbol: string;
  name: string;
  volume24h: string;
  liquidity: string;
  price: string;
  priceChange24h: string;
  holderCount: number;
}

export interface PancakeSwapPoolData {
  address: string;
  token0: {
    symbol: string;
    address: string;
  };
  token1: {
    symbol: string;
    address: string;
  };
  liquidityUSD: string;
  volumeUSD24h: string;
}
