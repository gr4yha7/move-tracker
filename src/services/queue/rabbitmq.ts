import amqp, { Channel, ChannelModel } from "amqplib";
import config from "../../config";
import { logger } from "../../utils/logger";
import { BlockchainType } from "../../types/blockchain";

export interface QueueMessage {
  walletAddress: string;
  blockchain: BlockchainType;
  fromBlock?: number;
}

class RabbitMQService {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private static instance: RabbitMQService;

  private readonly WALLET_TRACK_QUEUE = "wallet_track_queue";

  private constructor() {}

  public static getInstance(): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService();
    }
    return RabbitMQService.instance;
  }

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // Ensure queue exists
      await this.channel.assertQueue(this.WALLET_TRACK_QUEUE, {
        durable: true,
      });

      logger.info("Connected to RabbitMQ");

      // Handle connection close
      this.connection.on("close", () => {
        logger.error("RabbitMQ connection closed");
        setTimeout(() => this.connect(), 5000);
      });
    } catch (error) {
      logger.error("RabbitMQ connection error:", error);
      setTimeout(() => this.connect(), 5000);
    }
  }

  async publishWalletTrackMessage(message: QueueMessage): Promise<boolean> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const result = this.channel!.sendToQueue(
        this.WALLET_TRACK_QUEUE,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      logger.debug(
        `Published message to track wallet ${message.walletAddress} on ${message.blockchain}`
      );
      return result;
    } catch (error) {
      logger.error("Error publishing message to RabbitMQ:", error);
      return false;
    }
  }

  async consumeWalletTrackQueue(
    callback: (message: QueueMessage) => Promise<void>
  ): Promise<void> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      await this.channel!.consume(
        this.WALLET_TRACK_QUEUE,
        async (msg) => {
          if (msg) {
            try {
              const message: QueueMessage = JSON.parse(msg.content.toString());
              await callback(message);
              this.channel!.ack(msg);
            } catch (error) {
              logger.error("Error processing message:", error);
              // Negative acknowledgment to requeue the message
              this.channel!.nack(msg);
            }
          }
        },
        {
          noAck: false,
        }
      );

      logger.info("Consumer registered for wallet tracking queue");
    } catch (error) {
      logger.error("Error setting up consumer:", error);
      setTimeout(() => this.consumeWalletTrackQueue(callback), 5000);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info("Disconnected from RabbitMQ");
    } catch (error) {
      logger.error("Error disconnecting from RabbitMQ:", error);
    }
  }
}

export default RabbitMQService.getInstance();
