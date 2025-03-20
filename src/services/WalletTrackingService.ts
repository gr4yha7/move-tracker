import { BlockchainServiceFactory } from "./blockchain";
import { BlockchainType, TransactionType } from "../types/blockchain";
import { Transaction } from "../models/Transaction";
import { TrackedWallet } from "../models/TrackedWallet";
import rabbitmqService, { QueueMessage } from "./queue/rabbitmq";
import { logger } from "../utils/logger";

class WalletTrackingService {
  private static instance: WalletTrackingService;

  private constructor() {}

  public static getInstance(): WalletTrackingService {
    if (!WalletTrackingService.instance) {
      WalletTrackingService.instance = new WalletTrackingService();
    }
    return WalletTrackingService.instance;
  }

  /**
   * Start tracking a wallet on a specific blockchain
   */
  async trackWallet(
    walletAddress: string,
    blockchain: BlockchainType
  ): Promise<boolean> {
    try {
      // Create or update tracked wallet in the database
      const blockchainService = BlockchainServiceFactory.getService(blockchain);
      const currentBlockHeight =
        await blockchainService.getCurrentBlockHeight();

      // Create or update the tracked wallet document
      await TrackedWallet.findOneAndUpdate(
        { address: walletAddress, blockchain },
        {
          address: walletAddress,
          blockchain,
          lastProcessedBlock: currentBlockHeight - 1000, // Start tracking from 1000 blocks back
          isActive: true,
        },
        { upsert: true, new: true }
      );

      // Queue the initial tracking job
      await rabbitmqService.publishWalletTrackMessage({
        walletAddress,
        blockchain,
        fromBlock: currentBlockHeight - 1000, // Start tracking from 1000 blocks back
      });

      logger.info(`Started tracking wallet ${walletAddress} on ${blockchain}`);
      return true;
    } catch (error) {
      logger.error(
        `Error tracking wallet ${walletAddress} on ${blockchain}:`,
        error
      );
      return false;
    }
  }

  /**
   * Stop tracking a wallet on a specific blockchain
   */
  async stopTrackingWallet(
    walletAddress: string,
    blockchain: BlockchainType
  ): Promise<boolean> {
    try {
      await TrackedWallet.findOneAndUpdate(
        { address: walletAddress, blockchain },
        { isActive: false }
      );

      logger.info(`Stopped tracking wallet ${walletAddress} on ${blockchain}`);
      return true;
    } catch (error) {
      logger.error(
        `Error stopping wallet tracking for ${walletAddress} on ${blockchain}:`,
        error
      );
      return false;
    }
  }

  /**
   * Process a wallet tracking job from the queue
   */
  async processWalletTrackingJob(message: QueueMessage): Promise<void> {
    const { walletAddress, blockchain, fromBlock } = message;

    try {
      // Get the tracked wallet from DB
      const trackedWallet = await TrackedWallet.findOne({
        address: walletAddress,
        blockchain,
        isActive: true,
      });

      if (!trackedWallet) {
        logger.warn(
          `Wallet ${walletAddress} on ${blockchain} is not active or does not exist`
        );
        return;
      }

      // Get the blockchain service
      const blockchainService = BlockchainServiceFactory.getService(blockchain);

      // Get the current block height
      const currentBlockHeight =
        await blockchainService.getCurrentBlockHeight();

      // Get the starting block (either from message or from tracked wallet)
      const startBlock = fromBlock || trackedWallet.lastProcessedBlock || 0;

      // Get token transfers
      const transfers = await blockchainService.getTokenTransfers(
        walletAddress,
        startBlock,
        currentBlockHeight
      );

      // Get token swaps
      const swaps = await blockchainService.getTokenSwaps(
        walletAddress,
        startBlock,
        currentBlockHeight
      );

      // Save transfers to database
      if (transfers.length > 0) {
        const transferTransactions = transfers.map((transfer) => ({
          blockchain,
          transactionType: TransactionType.TRANSFER,
          transactionHash: transfer.transactionHash,
          blockHeight: transfer.blockHeight,
          timestamp: transfer.timestamp,
          walletAddress,
          tokenAddress: transfer.tokenAddress,
          tokenName: transfer.tokenName,
          tokenSymbol: transfer.tokenSymbol,
          amount: transfer.amount,
          decimals: transfer.decimals,
          fromAddress: transfer.fromAddress,
          toAddress: transfer.toAddress,
        }));

        await Transaction.insertMany(transferTransactions);
        logger.info(
          `Saved ${transfers.length} transfers for wallet ${walletAddress} on ${blockchain}`
        );
      }

      // Save swaps to database
      if (swaps.length > 0) {
        const swapTransactions = swaps.map((swap) => ({
          blockchain,
          transactionType: TransactionType.SWAP,
          transactionHash: swap.transactionHash,
          blockHeight: swap.blockHeight,
          timestamp: swap.timestamp,
          walletAddress,
          tokenInAddress: swap.tokenInAddress,
          tokenInName: swap.tokenInName,
          tokenInSymbol: swap.tokenInSymbol,
          amountIn: swap.amountIn,
          decimalsIn: swap.decimalsIn,
          tokenOutAddress: swap.tokenOutAddress,
          tokenOutName: swap.tokenOutName,
          tokenOutSymbol: swap.tokenOutSymbol,
          amountOut: swap.amountOut,
          decimalsOut: swap.decimalsOut,
          exchangeAddress: swap.exchangeAddress,
          exchangeName: swap.exchangeName,
        }));

        await Transaction.insertMany(swapTransactions);
        logger.info(
          `Saved ${swaps.length} swaps for wallet ${walletAddress} on ${blockchain}`
        );
      }

      // Update the last processed block
      await TrackedWallet.findOneAndUpdate(
        { address: walletAddress, blockchain },
        { lastProcessedBlock: currentBlockHeight }
      );

      // Schedule next tracking job after some time
      setTimeout(async () => {
        if (trackedWallet.isActive) {
          await rabbitmqService.publishWalletTrackMessage({
            walletAddress,
            blockchain,
            fromBlock: currentBlockHeight,
          });
        }
      }, 60000); // Check again after 1 minute
    } catch (error) {
      logger.error(
        `Error processing wallet tracking job for ${walletAddress} on ${blockchain}:`,
        error
      );

      // Requeue the job with a delay
      setTimeout(async () => {
        await rabbitmqService.publishWalletTrackMessage(message);
      }, 30000); // Retry after 30 seconds
    }
  }

  /**
   * Start the wallet tracking consumer
   */
  async startConsumer(): Promise<void> {
    try {
      await rabbitmqService.connect();
      await rabbitmqService.consumeWalletTrackQueue(
        this.processWalletTrackingJob.bind(this)
      );
      logger.info("Started wallet tracking consumer");
    } catch (error) {
      logger.error("Error starting wallet tracking consumer:", error);
      setTimeout(() => this.startConsumer(), 5000);
    }
  }
}

export default WalletTrackingService.getInstance();
