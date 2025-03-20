import axios from "axios";
import { IBlockchainService } from "../IBlockchainService";
import { TokenSwap, TokenTransfer } from "../../../types/blockchain";
import config from "../../../config";
import { logger } from "../../../utils/logger";

class SuiService implements IBlockchainService {
  private readonly apiUrl: string;

  constructor() {
    this.apiUrl = config.blockchain.sui.apiUrl;
  }

  async getCurrentBlockHeight(): Promise<number> {
    try {
      const response = await axios.post(this.apiUrl, {
        jsonrpc: "2.0",
        id: 1,
        method: "sui_getLatestCheckpointSequenceNumber",
        params: [],
      });

      return parseInt(response.data.result, 10);
    } catch (error) {
      logger.error("Error getting current Sui checkpoint number:", error);
      throw error;
    }
  }

  async getTokenTransfers(
    walletAddress: string,
    fromBlock: number,
    toBlock?: number
  ): Promise<TokenTransfer[]> {
    try {
      // Get transactions for the wallet
      const response = await axios.post(this.apiUrl, {
        jsonrpc: "2.0",
        id: 1,
        method: "suix_queryTransactionBlocks",
        params: [
          {
            filter: {
              FromOrTo: walletAddress,
            },
            options: {
              showEffects: true,
              showInput: true,
              showEvents: true,
            },
          },
          null,
          100, // Limit
          false, // Descending order
        ],
      });

      const transfers: TokenTransfer[] = [];

      const transactions = response.data.result.data || [];

      for (const tx of transactions) {
        // Check if the transaction has passed the current checkpoint number
        if (parseInt(tx.checkpoint, 10) < fromBlock) {
          continue;
        }

        if (toBlock && parseInt(tx.checkpoint, 10) > toBlock) {
          continue;
        }

        try {
          // Check for coin transfer events
          const events = tx.events || [];
          for (const event of events) {
            if (event.type.includes("CoinBalanceChange")) {
              const { changeType } = event.fields;

              // Only process transfers (not gas fees, etc.)
              if (changeType === "Receive" || changeType === "Pay") {
                const { amount } = event.fields;
                const { coinType } = event.fields;
                const fromAddress =
                  changeType === "Pay" ? walletAddress : event.fields.sender;
                const toAddress =
                  changeType === "Receive"
                    ? walletAddress
                    : event.fields.recipient;

                transfers.push({
                  tokenAddress: coinType,
                  amount,
                  fromAddress,
                  toAddress,
                  timestamp: new Date(parseInt(tx.timestampMs, 10)),
                  transactionHash: tx.digest,
                  blockHeight: parseInt(tx.checkpoint, 10),
                });
              }
            }
          }
        } catch (error) {
          logger.error(
            `Error parsing Sui transfer transaction ${tx.digest}:`,
            error
          );
        }
      }

      return transfers;
    } catch (error) {
      logger.error(
        `Error getting Sui token transfers for wallet ${walletAddress}:`,
        error
      );
      throw error;
    }
  }

  async getTokenSwaps(
    walletAddress: string,
    fromBlock: number,
    toBlock?: number
  ): Promise<TokenSwap[]> {
    try {
      // Get transactions for the wallet
      const response = await axios.post(this.apiUrl, {
        jsonrpc: "2.0",
        id: 1,
        method: "suix_queryTransactionBlocks",
        params: [
          {
            filter: {
              FromOrTo: walletAddress,
            },
            options: {
              showEffects: true,
              showInput: true,
              showEvents: true,
            },
          },
          null,
          100, // Limit
          false, // Descending order
        ],
      });

      const swaps: TokenSwap[] = [];

      const transactions = response.data.result.data || [];

      for (const tx of transactions) {
        // Check if the transaction has passed the current checkpoint number
        if (parseInt(tx.checkpoint, 10) < fromBlock) {
          continue;
        }

        if (toBlock && parseInt(tx.checkpoint, 10) > toBlock) {
          continue;
        }

        try {
          // Process move calls to identify DEX swaps
          if (
            tx.transaction?.data?.transaction?.kind ===
            "ProgrammableTransaction"
          ) {
            const commands = tx.transaction.data.transaction.transactions || [];

            // Find DEX-related function calls
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const swapCommand = commands.find((cmd: any) => {
              if (cmd.MoveCall) {
                const functionName = cmd.MoveCall.function;
                // Common swap function patterns in Sui DEXs
                return (
                  functionName.includes("swap") ||
                  functionName.includes("exchange") ||
                  functionName.includes("trade")
                );
              }
              return false;
            });

            if (swapCommand) {
              // Find the input and output coin events for the swap
              const events = tx.events || [];

              // Find input token event (coin balance decrease)
              const inputEvents = events.filter(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (e: any) =>
                  e.type.includes("CoinBalanceChange") &&
                  e.fields.changeType === "Pay" &&
                  e.fields.owner === walletAddress
              );

              // Find output token event (coin balance increase)
              const outputEvents = events.filter(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (e: any) =>
                  e.type.includes("CoinBalanceChange") &&
                  e.fields.changeType === "Receive" &&
                  e.fields.owner === walletAddress
              );

              if (inputEvents.length > 0 && outputEvents.length > 0) {
                // Get the largest input and output (excluding gas fees)
                const tokenIn = inputEvents.reduce(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (prev: any, current: any) =>
                    parseInt(prev.fields.amount, 10) >
                    parseInt(current.fields.amount, 10)
                      ? prev
                      : current
                );

                const tokenOut = outputEvents.reduce(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (prev: any, current: any) =>
                    parseInt(prev.fields.amount, 10) >
                    parseInt(current.fields.amount, 10)
                      ? prev
                      : current
                );

                swaps.push({
                  tokenInAddress: tokenIn.fields.coinType,
                  amountIn: tokenIn.fields.amount,
                  tokenOutAddress: tokenOut.fields.coinType,
                  amountOut: tokenOut.fields.amount,
                  exchangeAddress: swapCommand.MoveCall.package,
                  walletAddress,
                  timestamp: new Date(parseInt(tx.timestampMs, 10)),
                  transactionHash: tx.digest,
                  blockHeight: parseInt(tx.checkpoint, 10),
                });
              }
            }
          }
        } catch (error) {
          logger.error(
            `Error parsing Sui swap transaction ${tx.digest}:`,
            error
          );
        }
      }

      return swaps;
    } catch (error) {
      logger.error(
        `Error getting Sui token swaps for wallet ${walletAddress}:`,
        error
      );
      throw error;
    }
  }
}

export default new SuiService();
