import mongoose from "mongoose";
import config from "./index";
import { logger } from "../utils/logger";

export async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.database.uri);
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");
  } catch (error) {
    logger.error("MongoDB disconnection error:", error);
  }
}
