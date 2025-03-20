export enum BlockchainType {
  APTOS = "aptos",
  SUI = "sui",
  MOVEMENT = "movement",
}

export enum TransactionType {
  TRANSFER = "transfer",
  SWAP = "swap",
}

export interface TokenTransfer {
  tokenAddress: string;
  tokenName?: string;
  tokenSymbol?: string;
  amount: string;
  decimals?: number;
  fromAddress: string;
  toAddress: string;
  timestamp: Date;
  transactionHash: string;
  blockHeight: number;
}

export interface TokenSwap {
  tokenInAddress: string;
  tokenInName?: string;
  tokenInSymbol?: string;
  amountIn: string;
  decimalsIn?: number;
  tokenOutAddress: string;
  tokenOutName?: string;
  tokenOutSymbol?: string;
  amountOut: string;
  decimalsOut?: number;
  exchangeAddress: string;
  exchangeName?: string;
  walletAddress: string;
  timestamp: Date;
  transactionHash: string;
  blockHeight: number;
}
