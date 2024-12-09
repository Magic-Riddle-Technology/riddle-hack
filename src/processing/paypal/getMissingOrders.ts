import { existsSync, mkdirSync } from "fs";
import { initializeDB } from "../../db";
import { Order } from "../../models/order";
import { Transaction } from "../../models/transaction";

async function writeMissingOrdersToCSV(missingOrders: any[]) {
  if (!existsSync("reports")) {
    mkdirSync("reports");
  }
  const file = Bun.file("reports/missing_orders.csv");
  const writer = file.writer();

  writer.write("order_id\n");

  for (const order of missingOrders) {
    const row = [order.platform_id].join(",");
    writer.write(row + "\n");
  }

  writer.end();
}

/**
 * This function will get all shopify ghost transactions that are from paypal and will check if there is an order for that transaction
 * @returns writes a csv file with the missing orders
 */
async function getMissingOrders() {
  await initializeDB();

  const BATCH_SIZE = 500;
  const missingOrders: any[] = [];
  let skip = 0;

  while (true) {
    const shopifyBatch = (await Transaction.find({
      gateway: "paypal",
      status: "success",
    })
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean()) as any;

    if (shopifyBatch.length === 0) {
      console.log("no more transactions");
      break;
    }

    for (const shopifyTx of shopifyBatch) {
      let filter = {
        platform_id: shopifyTx.platform_data.order_id.toString(),
      };
      const matchingOrder = await Order.findOne(filter).lean();

      if (!matchingOrder) {
        missingOrders.push({
          platform_id: shopifyTx.platform_data.order_id.toString(),
        });
      }
    }

    skip += BATCH_SIZE;
  }

  console.log(missingOrders.length);
  await writeMissingOrdersToCSV(missingOrders);
  return missingOrders;
}

getMissingOrders();
