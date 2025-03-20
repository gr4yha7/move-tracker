import { Router } from "express";
import * as walletController from "../controllers/walletController";

const router = Router();

/**
 * @route   POST /api/wallets/track
 * @desc    Start tracking a wallet
 * @access  Public
 */
router.post("/track", walletController.trackWallet);

/**
 * @route   POST /api/wallets/stop-tracking
 * @desc    Stop tracking a wallet
 * @access  Public
 */
router.post("/stop-tracking", walletController.stopTrackingWallet);

/**
 * @route   GET /api/wallets
 * @desc    Get all tracked wallets
 * @access  Public
 */
router.get("/", walletController.getTrackedWallets);

/**
 * @route   GET /api/wallets/transactions
 * @desc    Get transactions for a wallet
 * @access  Public
 */
router.get("/transactions", walletController.getWalletTransactions);

export default router;
