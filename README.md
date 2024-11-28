# Rutter Hack

This tool helps us deliver quick solutions to merchants without an infrastructure overhead. We can import data from Rutter API into MongoDB, supporting transactions, orders, and payouts.

## Prerequisites

1. Install [Bun](https://bun.sh/) runtime environment

   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

## Setup

1. Clone the repository
2. Install dependencies:

   ```bash
   bun install
   ```

3. Create a `.env` file based on `.env.example`:

   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env` with your specific values:
   - `MONGODB_URI`: Your MongoDB connection string
   - `TRANSACTIONS_RUTTER_ACCESS_TOKEN`: Access token for transactions (get from rutter)
   - `ORDERS_RUTTER_ACCESS_TOKEN`: Access token for orders (get from rutter)
   - `PAYOUTS_RUTTER_ACCESS_TOKEN`: Access token for payouts (get from rutter)
   - `RUTTER_AUTH`: Rutter API key (get from rutter)
   - `RUTTER_API_VERSION`: Rutter API version (get from rutter)

## Usage

1. Open `src/import/index.ts`
2. Comment/uncomment the import functions you want to run:

   ```typescript
   importTransactions().catch(console.error);
   //importOrders().catch(console.error);
   //importPayouts().catch(console.error);
   ```

3. Run the import:

   ```bash
   bun run import
   ```

## Creating New Scripts

When creating new files that interact with the database, remember to:

1. Import the database initialization at the top of your file:

   ```typescript
   import { initializeDB } from "../db";
   ```

2. Initialize the database connection before performing operations:

   ```typescript
   await initializeDB();
   ```

## Environment Variables

See `.env.example` for all required environment variables. Make sure to set all required variables before running the application.
