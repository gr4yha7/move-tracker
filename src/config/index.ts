import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
  },
  database: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/wallet-tracker",
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://localhost",
  },
  blockchain: {
    aptos: {
      apiUrl:
        process.env.APTOS_API_URL ||
        "https://fullnode.mainnet.aptoslabs.com/v1",
    },
    sui: {
      apiUrl: process.env.SUI_API_URL || "https://fullnode.mainnet.sui.io",
    },
    movement: {
      apiUrl:
        process.env.MOVEMENT_API_URL || "https://seed-node1.movementlabs.xyz",
    },
  },
};

export default config;
