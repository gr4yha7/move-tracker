import { Request, Response } from "express";
import { TrackedWallet } from "../models/TrackedWallet";
import { Transaction } from "../models/Transaction";
import { BlockchainType, TransactionType } from "../types/blockchain";
import walletTrackingService from "../services/WalletTrackingService";
import { logger } from "../utils/logger";

/**
 * Start tracking a wallet
 */
export const trackWallet = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { walletAddress, blockchain } = req.body;

    // Validate inputs
    if (!walletAddress || !blockchain) {
      res.status(400).json({
        success: false,
        message: "Wallet address and blockchain are required",
      });
      return;
    }

    // Validate blockchain type
    if (!Object.values(BlockchainType).includes(blockchain)) {
      res.status(400).json({
        success: false,
        message: `Invalid blockchain. Supported blockchains: ${Object.values(BlockchainType).join(", ")}`,
      });
      return;
    }

    // Start tracking
    const success = await walletTrackingService.trackWallet(
      walletAddress,
      blockchain
    );

    if (success) {
      res.status(200).json({
        success: true,
        message: `Started tracking wallet ${walletAddress} on ${blockchain}`,
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Failed to start tracking wallet ${walletAddress} on ${blockchain}`,
      });
    }
  } catch (error) {
    logger.error("Error in trackWallet controller:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Stop tracking a wallet
 */
export const stopTrackingWallet = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { walletAddress, blockchain } = req.body;

    // Validate inputs
    if (!walletAddress || !blockchain) {
      res.status(400).json({
        success: false,
        message: "Wallet address and blockchain are required",
      });
      return;
    }

    // Validate blockchain type
    if (!Object.values(BlockchainType).includes(blockchain)) {
      res.status(400).json({
        success: false,
        message: `Invalid blockchain. Supported blockchains: ${Object.values(BlockchainType).join(", ")}`,
      });
      return;
    }

    // Stop tracking
    const success = await walletTrackingService.stopTrackingWallet(
      walletAddress,
      blockchain
    );

    if (success) {
      res.status(200).json({
        success: true,
        message: `Stopped tracking wallet ${walletAddress} on ${blockchain}`,
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Failed to stop tracking wallet ${walletAddress} on ${blockchain}`,
      });
    }
  } catch (error) {
    logger.error("Error in stopTrackingWallet controller:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get all tracked wallets
 */
export const getTrackedWallets = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { blockchain } = req.query;

    let query = {};

    // Filter by blockchain if provided
    if (blockchain) {
      if (
        !Object.values(BlockchainType).includes(blockchain as BlockchainType)
      ) {
        res.status(400).json({
          success: false,
          message: `Invalid blockchain. Supported blockchains: ${Object.values(BlockchainType).join(", ")}`,
        });
        return;
      }

      query = { blockchain };
    }

    const wallets = await TrackedWallet.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: wallets,
    });
  } catch (error) {
    logger.error("Error in getTrackedWallets controller:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get transactions for a wallet
 */
export const getWalletTransactions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      walletAddress,
      blockchain,
      transactionType,
      limit = 50,
      page = 1,
    } = req.query;

    // Validate inputs
    if (!walletAddress) {
      res
        .status(400)
        .json({ success: false, message: "Wallet address is required" });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { walletAddress };

    // Add blockchain filter if provided
    if (blockchain) {
      if (
        !Object.values(BlockchainType).includes(blockchain as BlockchainType)
      ) {
        res.status(400).json({
          success: false,
          message: `Invalid blockchain. Supported blockchains: ${Object.values(BlockchainType).join(", ")}`,
        });
        return;
      }

      query.blockchain = blockchain;
    }

    // Add transaction type filter if provided
    if (transactionType) {
      if (
        !Object.values(TransactionType).includes(
          transactionType as TransactionType
        )
      ) {
        res.status(400).json({
          success: false,
          message: `Invalid transaction type. Supported types: ${Object.values(TransactionType).join(", ")}`,
        });
        return;
      }

      query.transactionType = transactionType;
    }

    // Parse pagination params
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get transactions with pagination
    const transactions = await Transaction.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error("Error in getWalletTransactions controller:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
