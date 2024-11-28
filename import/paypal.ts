import axios from "axios";
import Bun from "bun";
import dotenv from "dotenv";

dotenv.config();

const importPaypalData = async () => {
  const startTime = performance.now();
  let transactionCount = 0;
  const baseUrl = "https://production.rutterapi.com/versioned/transactions/";
  const accessToken = process.env.PAYPAL_ACCESS_TOKEN;
  let hasMoreData = true;
  let nextCursor = null;

  const file = Bun.file("transactions.csv");
  const writer = file.writer();

  writer.write("created_at,platform_id\n");

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
        writer.write(`${transaction.created_at},${transaction.platform_id}\n`);
      }
      writer.flush();

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

  writer.end();
  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;
  console.log(`Data import completed in ${duration.toFixed(2)} seconds`);
  console.log(`Total transactions: ${transactionCount}`);
};

importPaypalData();
