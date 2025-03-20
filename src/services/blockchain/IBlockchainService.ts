import { TokenSwap, TokenTransfer } from "../../types/blockchain";

export interface IBlockchainService {
  /**
   * Get the current block height of the blockchain
   */
  getCurrentBlockHeight(): Promise<number>;

  /**
   * Get token transfers for a wallet address from a specific block height
   * @param walletAddress The wallet address to track
   * @param fromBlock The block height to start tracking from
   * @param toBlock Optional end block height
   */
  getTokenTransfers(
    walletAddress: string,
    fromBlock: number,
    toBlock?: number
  ): Promise<TokenTransfer[]>;

  /**
   * Get token swaps for a wallet address from a specific block height
   * @param walletAddress The wallet address to track
   * @param fromBlock The block height to start tracking from
   * @param toBlock Optional end block height
   */
  getTokenSwaps(
    walletAddress: string,
    fromBlock: number,
    toBlock?: number
  ): Promise<TokenSwap[]>;
}
