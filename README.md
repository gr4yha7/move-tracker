# Move Tracker

A wallet tracking backend service for monitoring on-chain interactions across Aptos, Sui, and Movement blockchains.

## Features

- Track token transfers and DEX swaps for specific wallets
- Support for Aptos, Sui, and Movement blockchains
- REST API for integrating with external applications
- Background processing using RabbitMQ for reliable transaction tracking

## Tech Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Message Queue**: RabbitMQ for background tasks
- **Blockchain Interaction**: Blockchain-specific APIs and SDKs

## Prerequisites

- Node.js (v16+)
- MongoDB
- RabbitMQ

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/move-tracker.git
   cd move-tracker
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create `.env` file:
   ```
   cp .env.example .env
   ```

4. Update environment variables in `.env` as needed.

## Development

Start the server in development mode:

```
npm run dev
```

## Build and Run for Production

Build the application:

```
npm run build
```

Start the server in production mode:

```
npm start
```

## API Endpoints

### Wallet Tracking

- **POST /api/wallets/track**
  - Start tracking a wallet
  - Body: `{ "walletAddress": "0x...", "blockchain": "aptos" }`

- **POST /api/wallets/stop-tracking**
  - Stop tracking a wallet
  - Body: `{ "walletAddress": "0x...", "blockchain": "aptos" }`

- **GET /api/wallets**
  - Get all tracked wallets
  - Query params: `?blockchain=aptos` (optional)

- **GET /api/wallets/transactions**
  - Get transactions for a wallet
  - Query params: `?walletAddress=0x...&blockchain=aptos&transactionType=transfer&limit=50&page=1`

## Architecture

The service follows a modular architecture with the following components:

1. **API Layer**: Express.js routes and controllers for HTTP endpoints
2. **Services Layer**: Business logic for blockchain interactions and wallet tracking
3. **Data Layer**: MongoDB models for storing wallet and transaction data
4. **Queue Layer**: RabbitMQ for background processing of blockchain events

## License

[MIT](LICENSE)
