import app from "./app";
import config from "./config";
import { logger } from "./utils/logger";

const PORT = config.server.port;

async function startServer(): Promise<void> {
  try {
    // Initialize the application
    await app.start();

    // Start the server
    app.app.listen(PORT, () => {
      logger.info(
        `Server running on port ${PORT} in ${config.server.nodeEnv} mode`
      );
    });

    // Handle graceful shutdown
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info("Shutting down gracefully...");
  process.exit(0);
}

// Start the server
startServer();
