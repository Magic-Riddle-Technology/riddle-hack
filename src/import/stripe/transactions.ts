import axios from "axios";
import dotenv from "dotenv";
import { Transaction } from "../../models/transaction";

dotenv.config();

const importPaypalData = async () => {
  const startTime = performance.now();
  let transactionCount = 0;
  const baseUrl = "https://production.rutterapi.com/versioned/transactions/";
  const accessToken = process.env.STRIPE_RUTTER_ACCESS_TOKEN;
  let hasMoreData = true;
  let nextCursor = null;
  const batchSize = 500;
  let batch: any[] = [];

  while (hasMoreData) {
    const url = `${baseUrl}?access_token=${accessToken}&expand=platform_data&limit=500${
      nextCursor ? `&cursor=${nextCursor}` : ""
    }`;

    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: process.env.RUTTER_AUTH,
          "X-Rutter-Version": process.env.RUTTER_API_VERSION,
        },
      });
      const { transactions, next_cursor } = response.data;

      transactionCount += transactions.length;
      console.log(
        `Fetched ${transactions.length} transactions. Total: ${transactionCount}`
      );

      for (const transaction of transactions) {
        batch.push(transaction);

        if (batch.length >= batchSize) {
          await Promise.all(
            batch.map((transaction) => Transaction.create(transaction))
          );
          batch = [];
        }
      }

      if (batch.length > 0) {
        await Promise.all(
          batch.map((transaction) => Transaction.create(transaction))
        );
      }

      if (next_cursor) {
        nextCursor = next_cursor;
      } else {
        hasMoreData = false;
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      hasMoreData = false;
    }
  }

  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;
  console.log(`Data import completed in ${duration.toFixed(2)} seconds`);
  console.log(`Total transactions: ${transactionCount}`);
};

importPaypalData().catch(console.error);
