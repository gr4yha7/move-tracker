import axios from "axios";
import { IBlockchainService } from "../IBlockchainService";
import { TokenSwap, TokenTransfer } from "../../../types/blockchain";
import config from "../../../config";
import { logger } from "../../../utils/logger";

class AptosService implements IBlockchainService {
  private readonly apiUrl: string;

  constructor() {
    this.apiUrl = config.blockchain.aptos.apiUrl;
  }

  async getCurrentBlockHeight(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/blocks/by_height/latest`
      );
      return parseInt(response.data.block_height, 10);
    } catch (error) {
      logger.error("Error getting current Aptos block height:", error);
      throw error;
    }
  }

  async getTokenTransfers(
    walletAddress: string,
    fromBlock: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    toBlock?: number
  ): Promise<TokenTransfer[]> {
    try {
      // Filter to only coin transfers
      const response = await axios.get(
        `${this.apiUrl}/accounts/${walletAddress}/transactions`,
        {
          params: {
            start: fromBlock,
            limit: 100,
          },
        }
      );

      const transfers: TokenTransfer[] = [];

      for (const tx of response.data) {
        if (
          tx.type === "user_transaction" &&
          tx.payload?.type === "0x1::coin::transfer"
        ) {
          try {
            // Extract token transfer information
            const tokenAddress = tx.payload.function.split("::")[0];
            const toAddress = tx.payload.arguments[0];
            const amount = tx.payload.arguments[1];

            transfers.push({
              tokenAddress,
              amount,
              fromAddress: walletAddress,
              toAddress,
              timestamp: new Date(tx.timestamp),
              transactionHash: tx.hash,
              blockHeight: parseInt(tx.version, 10),
            });
          } catch (error) {
            logger.error(
              `Error parsing Aptos transfer transaction ${tx.hash}:`,
              error
            );
          }
        } else if (
          walletAddress.toLowerCase() === tx.receiver.toLowerCase() &&
          tx.type === "user_transaction"
        ) {
          // Check if this wallet is receiving transfers
          try {
            const events = tx.events || [];
            for (const event of events) {
              if (event.type.includes("CoinDeposited")) {
                const tokenAddress = event.type.split("<")[1].split(">")[0];
                const { amount } = event.data;

                transfers.push({
                  tokenAddress,
                  amount,
                  fromAddress: tx.sender,
                  toAddress: walletAddress,
                  timestamp: new Date(tx.timestamp),
                  transactionHash: tx.hash,
                  blockHeight: parseInt(tx.version, 10),
                });
              }
            }
          } catch (error) {
            logger.error(
              `Error parsing Aptos deposit event ${tx.hash}:`,
              error
            );
          }
        }
      }

      return transfers;
    } catch (error) {
      logger.error(
        `Error getting Aptos token transfers for wallet ${walletAddress}:`,
        error
      );
      throw error;
    }
  }

  async getTokenSwaps(
    walletAddress: string,
    fromBlock: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    toBlock?: number
  ): Promise<TokenSwap[]> {
    try {
      // Get transactions for the wallet
      const response = await axios.get(
        `${this.apiUrl}/accounts/${walletAddress}/transactions`,
        {
          params: {
            start: fromBlock,
            limit: 100,
          },
        }
      );

      const swaps: TokenSwap[] = [];

      for (const tx of response.data) {
        if (tx.type === "user_transaction") {
          try {
            const events = tx.events || [];

            // Look for swap events
            // This is a simplified example - actual implementation would need to identify specific DEX patterns
            const swapEventIndex = events.findIndex(
              (e: Event) =>
                e.type.includes("swap") ||
                e.type.includes("Swap") ||
                e.type.toLowerCase().includes("exchange")
            );

            if (swapEventIndex !== -1) {
              const swapEvent = events[swapEventIndex];
              const exchangeAddress = swapEvent.type.split("::")[0];

              // Look for token in and out events
              const tokenInEvent = events.find(
                (e: Event) =>
                  e.type.includes("Withdraw") || e.type.includes("withdraw")
              );
              const tokenOutEvent = events.find(
                (e: Event) =>
                  e.type.includes("Deposit") || e.type.includes("deposit")
              );

              if (tokenInEvent && tokenOutEvent) {
                swaps.push({
                  tokenInAddress: this.extractTypeFromEvent(tokenInEvent),
                  amountIn: tokenInEvent.data.amount,
                  tokenOutAddress: this.extractTypeFromEvent(tokenOutEvent),
                  amountOut: tokenOutEvent.data.amount,
                  exchangeAddress,
                  walletAddress,
                  timestamp: new Date(tx.timestamp),
                  transactionHash: tx.hash,
                  blockHeight: parseInt(tx.version, 10),
                });
              }
            }
          } catch (error) {
            logger.error(
              `Error parsing Aptos swap transaction ${tx.hash}:`,
              error
            );
          }
        }
      }

      return swaps;
    } catch (error) {
      logger.error(
        `Error getting Aptos token swaps for wallet ${walletAddress}:`,
        error
      );
      throw error;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractTypeFromEvent(event: any): string {
    try {
      // Extract the token type from an event
      if (event.type.includes("<") && event.type.includes(">")) {
        return event.type.split("<")[1].split(">")[0];
      }
      return event.type.split("::")[0];
    } catch (error) {
      logger.error("Error extracting type from event:", error);
      return "";
    }
  }
}

export default new AptosService();
