import mongoose, { Document, Schema } from "mongoose";
import { BlockchainType } from "../types/blockchain";

export interface ITrackedWallet extends Document {
  address: string;
  blockchain: BlockchainType;
  lastProcessedBlock?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TrackedWalletSchema = new Schema<ITrackedWallet>(
  {
    address: {
      type: String,
      required: true,
      trim: true,
    },
    blockchain: {
      type: String,
      required: true,
      enum: Object.values(BlockchainType),
    },
    lastProcessedBlock: {
      type: Number,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "tracked_wallets",
  }
);

// Create a compound index for efficient queries
TrackedWalletSchema.index({ address: 1, blockchain: 1 }, { unique: true });

export const TrackedWallet = mongoose.model<ITrackedWallet>(
  "TrackedWallet",
  TrackedWalletSchema
);
