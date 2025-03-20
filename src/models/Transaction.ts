import mongoose, { Document, Schema } from "mongoose";
import { BlockchainType, TransactionType } from "../types/blockchain";

export interface ITransaction extends Document {
  blockchain: BlockchainType;
  transactionType: TransactionType;
  transactionHash: string;
  blockHeight: number;
  timestamp: Date;
  walletAddress: string;
  // For transfers
  tokenAddress?: string;
  tokenName?: string;
  tokenSymbol?: string;
  amount?: string;
  decimals?: number;
  fromAddress?: string;
  toAddress?: string;
  // For swaps
  tokenInAddress?: string;
  tokenInName?: string;
  tokenInSymbol?: string;
  amountIn?: string;
  decimalsIn?: number;
  tokenOutAddress?: string;
  tokenOutName?: string;
  tokenOutSymbol?: string;
  amountOut?: string;
  decimalsOut?: number;
  exchangeAddress?: string;
  exchangeName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    blockchain: {
      type: String,
      required: true,
      enum: Object.values(BlockchainType),
    },
    transactionType: {
      type: String,
      required: true,
      enum: Object.values(TransactionType),
    },
    transactionHash: {
      type: String,
      required: true,
      index: true,
    },
    blockHeight: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    walletAddress: {
      type: String,
      required: true,
      index: true,
    },
    // For transfers
    tokenAddress: String,
    tokenName: String,
    tokenSymbol: String,
    amount: String,
    decimals: Number,
    fromAddress: String,
    toAddress: String,
    // For swaps
    tokenInAddress: String,
    tokenInName: String,
    tokenInSymbol: String,
    amountIn: String,
    decimalsIn: Number,
    tokenOutAddress: String,
    tokenOutName: String,
    tokenOutSymbol: String,
    amountOut: String,
    decimalsOut: Number,
    exchangeAddress: String,
    exchangeName: String,
  },
  {
    timestamps: true,
    collection: "transactions",
  }
);

// Create indexes for frequent query patterns
TransactionSchema.index({
  walletAddress: 1,
  blockchain: 1,
  transactionType: 1,
});
TransactionSchema.index({ blockchain: 1, blockHeight: 1 });
TransactionSchema.index({ timestamp: -1 });

export const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  TransactionSchema
);
