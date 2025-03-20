import axios from "axios";
import { IBlockchainService } from "../IBlockchainService";
import { TokenSwap, TokenTransfer } from "../../../types/blockchain";
import config from "../../../config";
import { logger } from "../../../utils/logger";

class MovementService implements IBlockchainService {
  private readonly apiUrl: string;

  constructor() {
    this.apiUrl = config.blockchain.movement.apiUrl;
  }

  async getCurrentBlockHeight(): Promise<number> {
    try {
      // Movement uses a similar API structure to Aptos since it's a fork
      const response = await axios.get(
        `${this.apiUrl}/v1/blocks/by_height/latest`
      );
      return parseInt(response.data.block_height, 10);
    } catch (error) {
      logger.error("Error getting current Movement block height:", error);
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
      // Movement is based on Aptos, so the API structure is similar
      const response = await axios.get(
        `${this.apiUrl}/v1/accounts/${walletAddress}/transactions`,
        {
          params: {
            start: fromBlock,
            limit: 100,
          },
        }
      );

      const transfers: TokenTransfer[] = [];

      for (const tx of response.data) {
        if (tx.type === "user_transaction") {
          try {
            // Check for token transfer functions
            if (
              tx.payload?.type === "entry_function_payload" &&
              (tx.payload.function.includes("::coin::transfer") ||
                tx.payload.function.includes("::coin::transfer_coins"))
            ) {
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
            }

            // Check events for deposits
            const events = tx.events || [];
            for (const event of events) {
              if (
                event.type.includes("CoinDeposited") ||
                event.type.includes("DepositEvent")
              ) {
                let tokenAddress;
                try {
                  // Try to extract token type from the event type
                  tokenAddress = event.type.split("<")[1].split(">")[0];
                } catch {
                  tokenAddress = event.type.split("::")[0];
                }

                const { amount } = event.data;
                const toAddress = event.data.to || walletAddress;

                // Only include if this wallet is the receiver
                if (toAddress.toLowerCase() === walletAddress.toLowerCase()) {
                  transfers.push({
                    tokenAddress,
                    amount,
                    fromAddress: tx.sender,
                    toAddress,
                    timestamp: new Date(tx.timestamp),
                    transactionHash: tx.hash,
                    blockHeight: parseInt(tx.version, 10),
                  });
                }
              }
            }
          } catch (error) {
            logger.error(
              `Error parsing Movement transfer transaction ${tx.hash}:`,
              error
            );
          }
        }
      }

      return transfers;
    } catch (error) {
      logger.error(
        `Error getting Movement token transfers for wallet ${walletAddress}:`,
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
        `${this.apiUrl}/v1/accounts/${walletAddress}/transactions`,
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
            // Check for swap function calls
            if (
              tx.payload?.type === "entry_function_payload" &&
              (tx.payload.function.includes("::swap") ||
                tx.payload.function.includes("::exchange"))
            ) {
              // Extract DEX package information
              const exchangeAddress = tx.payload.function.split("::")[0];

              // Look for events that indicate token swapping
              const events = tx.events || [];

              // Find swap-related events
              const swapEvent = events.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (e: any) =>
                  e.type.toLowerCase().includes("swap") ||
                  e.type.toLowerCase().includes("exchange")
              );

              if (swapEvent) {
                // Find withdraw and deposit events to determine token in/out
                const withdrawEvents = events.filter(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (e: any) =>
                    e.type.includes("Withdraw") || e.type.includes("withdraw")
                );

                const depositEvents = events.filter(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (e: any) =>
                    e.type.includes("Deposit") || e.type.includes("deposit")
                );

                if (withdrawEvents.length > 0 && depositEvents.length > 0) {
                  const tokenInEvent = withdrawEvents[0];
                  const tokenOutEvent = depositEvents[0];

                  let tokenInAddress, tokenOutAddress;

                  try {
                    tokenInAddress = tokenInEvent.type
                      .split("<")[1]
                      .split(">")[0];
                  } catch {
                    tokenInAddress = tokenInEvent.type.split("::")[0];
                  }

                  try {
                    tokenOutAddress = tokenOutEvent.type
                      .split("<")[1]
                      .split(">")[0];
                  } catch {
                    tokenOutAddress = tokenOutEvent.type.split("::")[0];
                  }

                  swaps.push({
                    tokenInAddress,
                    amountIn: tokenInEvent.data.amount,
                    tokenOutAddress,
                    amountOut: tokenOutEvent.data.amount,
                    exchangeAddress,
                    walletAddress,
                    timestamp: new Date(tx.timestamp),
                    transactionHash: tx.hash,
                    blockHeight: parseInt(tx.version, 10),
                  });
                }
              }
            }
          } catch (error) {
            logger.error(
              `Error parsing Movement swap transaction ${tx.hash}:`,
              error
            );
          }
        }
      }

      return swaps;
    } catch (error) {
      logger.error(
        `Error getting Movement token swaps for wallet ${walletAddress}:`,
        error
      );
      throw error;
    }
  }
}

export default new MovementService();
