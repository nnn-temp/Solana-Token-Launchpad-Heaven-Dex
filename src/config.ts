import { config } from 'dotenv';

config();

export const Config = {
  rpc: {
    url: process.env.RPC_URL || 'https://bsc-dataseed.binance.org',
  },
  wallet: {
    privateKey: process.env.PRIVATE_KEY || '',
  },
  trading: {
    slippage: parseFloat(process.env.SLIPPAGE || '5'),
    gasPriceGwei: process.env.GAS_PRICE_GWEI || '5',
    minBuyAmountBNB: parseFloat(process.env.MIN_BUY_AMOUNT_BNB || '0.01'),
    maxBuyAmountBNB: parseFloat(process.env.MAX_BUY_AMOUNT_BNB || '1.0'),
    takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT || '10'),
    stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT || '5'),
  },
  fourmeme: {
    apiUrl: process.env.FOURMEME_API_URL || 'https://api.fourmeme.com',
    apiKey: process.env.FOURMEME_API_KEY || '',
  },
  pancakeswap: {
    routerV2: process.env.PANCAKESWAP_ROUTER_V2 || '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    factory: process.env.PANCAKESWAP_FACTORY || '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    wbnbAddress: process.env.WBNB_ADDRESS || '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  },
  bot: {
    checkIntervalSeconds: parseInt(process.env.CHECK_INTERVAL_SECONDS || '60'),
    maxPositionSizeUSD: parseFloat(process.env.MAX_POSITION_SIZE_USD || '1000'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logToFile: process.env.LOG_TO_FILE === 'true',
  },
};
