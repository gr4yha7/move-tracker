import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { connectToDatabase } from "./config/database";
import walletRoutes from "./routes/walletRoutes";
import { logger } from "./utils/logger";
import walletTrackingService from "./services/WalletTrackingService";

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // Enable CORS
    this.app.use(cors());

    // Parse JSON bodies
    this.app.use(express.json());

    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private configureRoutes(): void {
    // Health check route
    this.app.get("/health", (_req: Request, res: Response) => {
      res.status(200).json({ status: "ok" });
    });

    // API routes
    this.app.use("/api/wallets", walletRoutes);

    // 404 route
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ message: "Route not found" });
    });
  }

  private configureErrorHandling(): void {
    // Global error handler
    this.app.use(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (err: Error, _req: Request, res: Response, _next: NextFunction) => {
        logger.error("Unhandled error:", err);
        res.status(500).json({ message: "Internal server error" });
      }
    );
  }

  public async start(): Promise<void> {
    try {
      // Connect to MongoDB
      await connectToDatabase();

      // Start the wallet tracking consumer
      await walletTrackingService.startConsumer();

      logger.info("Application initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize application:", error);
      process.exit(1);
    }
  }
}

export default new App();
