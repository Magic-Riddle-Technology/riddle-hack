import axios from "axios";
import dotenv from "dotenv";
import { Order } from "../models/order";
import { Payout } from "../models/payout";
import { Transaction } from "../models/transaction";

dotenv.config();

interface ImportConfig {
  path: string;
  modelClass: any;
  accessTokenEnvKey: string;
  batchSize?: number;
}

const importRutterData = async ({
  path,
  modelClass,
  accessTokenEnvKey,
  batchSize = 500,
}: ImportConfig) => {
  const startTime = performance.now();
  let recordCount = 0;
  const baseUrl = `https://production.rutterapi.com/versioned/${path}/`;
  const accessToken = process.env[accessTokenEnvKey];
  let hasMoreData = true;
  let nextCursor = null;
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
      const data = response.data;
      // Get the records array using the path name (e.g., transactions, orders)
      const records = data[path];

      recordCount += records.length;
      console.log(`Fetched ${records.length} ${path}. Total: ${recordCount}`);

      for (const record of records) {
        batch.push(record);

        if (batch.length >= batchSize) {
          await Promise.all(batch.map((record) => modelClass.create(record)));
          batch = [];
        }
      }

      if (batch.length > 0) {
        await Promise.all(batch.map((record) => modelClass.create(record)));
        batch = [];
      }

      if (data.next_cursor) {
        nextCursor = data.next_cursor;
      } else {
        hasMoreData = false;
      }
    } catch (error) {
      console.error(`Error fetching ${path}:`, error);
      hasMoreData = false;
    }
  }

  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;
  console.log(`${path} import completed in ${duration.toFixed(2)} seconds`);
  console.log(`Total ${path}: ${recordCount}`);
};

const importTransactions = () =>
  importRutterData({
    path: "transactions",
    modelClass: Transaction,
    accessTokenEnvKey: "STRIPE_RUTTER_ACCESS_TOKEN",
  });

const importOrders = () =>
  importRutterData({
    path: "orders",
    modelClass: Order,
    accessTokenEnvKey: "STRIPE_RUTTER_ACCESS_TOKEN",
  });

const importPayouts = () =>
  importRutterData({
    path: "payouts",
    modelClass: Payout,
    accessTokenEnvKey: "STRIPE_RUTTER_ACCESS_TOKEN",
  });

//importTransactions().catch(console.error);
//importOrders().catch(console.error);
//importPayouts().catch(console.error);
