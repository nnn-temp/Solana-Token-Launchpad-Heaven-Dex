import { ethers } from 'ethers';
import { Config } from '../config';
import { logger } from '../utils/logger';
import { Token, Position } from '../types';

const PANCAKESWAP_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

export class PancakeSwapService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private router: ethers.Contract;
  private wbnb: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(Config.rpc.url);
    this.wallet = new ethers.Wallet(Config.wallet.privateKey, this.provider);
    this.router = new ethers.Contract(Config.pancakeswap.routerV2, PANCAKESWAP_ROUTER_ABI, this.wallet);
    this.wbnb = new ethers.Contract(Config.pancakeswap.wbnbAddress, ERC20_ABI, this.wallet);
  }

  /**
   * Get current price for a token in BNB
   */
  async getPrice(tokenAddress: string): Promise<number> {
    try {
      const path = [Config.pancakeswap.wbnbAddress, tokenAddress];
      const amounts = await this.router.getAmountsOut(
        ethers.parseEther('1'),
        path
      );
      return parseFloat(ethers.formatEther(amounts[1]));
    } catch (error: any) {
      logger.error(`Error getting price for ${tokenAddress}:`, {
        message: error.message,
      });
      return 0;
    }
  }

  /**
   * Buy token with BNB
   */
  async buyToken(tokenAddress: string, amountBNB: number): Promise<boolean> {
    try {
      logger.info(`Buying token ${tokenAddress} with ${amountBNB} BNB`);

      const amountIn = ethers.parseEther(amountBNB.toString());
      const slippageAmount = this.calculateSlippage(amountIn, 'buy');
      
      const path = [Config.pancakeswap.wbnbAddress, tokenAddress];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      const tx = await this.router.swapExactETHForTokens(
        slippageAmount,
        path,
        this.wallet.address,
        deadline,
        { value: amountIn, gasPrice: ethers.parseUnits(Config.trading.gasPriceGwei, 'gwei') }
      );

      const receipt = await tx.wait();
      logger.info('Buy transaction confirmed:', {
        hash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
      });

      return true;
    } catch (error: any) {
      logger.error('Error buying token:', {
        message: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  /**
   * Sell token for BNB
   */
  async sellToken(tokenAddress: string, amount: bigint): Promise<boolean> {
    try {
      logger.info(`Selling ${amount.toString()} of token ${tokenAddress}`);

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
      
      // Check allowance
      const allowance = await tokenContract.allowance(
        this.wallet.address,
        Config.pancakeswap.routerV2
      );

      if (allowance < amount) {
        logger.info('Approving token spend...');
        const approveTx = await tokenContract.approve(
          Config.pancakeswap.routerV2,
          ethers.MaxUint256
        );
        await approveTx.wait();
      }

      const path = [tokenAddress, Config.pancakeswap.wbnbAddress];
      const amounts = await this.router.getAmountsOut(amount, path);
      const amountOutMin = this.calculateSlippage(amounts[1], 'sell');
      
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const tx = await this.router.swapExactTokensForETH(
        amount,
        amountOutMin,
        path,
        this.wallet.address,
        deadline,
        { gasPrice: ethers.parseUnits(Config.trading.gasPriceGwei, 'gwei') }
      );

      const receipt = await tx.wait();
      logger.info('Sell transaction confirmed:', {
        hash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
      });

      return true;
    } catch (error: any) {
      logger.error('Error selling token:', {
        message: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<bigint> {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
      const balance = await tokenContract.balanceOf(this.wallet.address);
      return balance;
    } catch (error: any) {
      logger.error('Error getting balance:', { message: error.message });
      return BigInt(0);
    }
  }

  /**
   * Get BNB balance
   */
  async getBNBBalance(): Promise<bigint> {
    return await this.provider.getBalance(this.wallet.address);
  }

  /**
   * Calculate slippage amount
   */
  private calculateSlippage(amount: bigint, side: 'buy' | 'sell'): bigint {
    const slippagePercent = BigInt(Config.trading.slippage);
    const slippageAmount = (amount * slippagePercent) / BigInt(100);
    
    return side === 'buy'
      ? amount - slippageAmount
      : amount + slippageAmount;
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.wallet.address;
  }
}
