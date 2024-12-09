import { existsSync, mkdirSync } from "fs";
import { initializeDB } from "../../db";
import { Transaction } from "../../models/transaction";

async function writeMissingTransactionsToCSV(missingTransactions: any[]) {
  if (!existsSync("reports")) {
    mkdirSync("reports");
  }
  const file = Bun.file("reports/missing_ghost_transactions.csv");
  const writer = file.writer();

  writer.write("paypalTransactionId,type,status,date\n");

  for (const tx of missingTransactions) {
    const row = [tx.platform_id, tx.type, tx.status, tx.date].join(",");

    writer.write(row + "\n");
  }

  writer.end();
}

/**
 * This function will get all paypal transactions and will check if there is a shopify ghost transaction for that paypal transaction
 * @returns writes a csv file with the paypal transaction IDs that are missing a shopify transaction
 */
async function getMissingShopifyTransactions() {
  await initializeDB();

  const BATCH_SIZE = 500;
  const missingTransactions: any[] = [];
  let skip = 0;

  while (true) {
    const paypalBatch = (await Transaction.find({
      gateway: "Payflow Gateway",
      status: "success",
    })
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean()) as any;

    console.log("length", paypalBatch.length);

    if (paypalBatch.length === 0) {
      console.log("No more transactions to process");
      break;
    }

    for (const paypalTx of paypalBatch) {
      if (!paypalTx) continue;

      const matchingShopifyTx = await Transaction.findOne({
        gateway: "paypal",
        $or: [
          {
            "platform_data.receipt.transaction_id": paypalTx.platform_id,
          },
          {
            "platform_data.receipt.refund_transaction_id": paypalTx.platform_id,
          },
        ],
      }).lean();

      if (!matchingShopifyTx) {
        missingTransactions.push(paypalTx);
      }
    }

    skip += BATCH_SIZE;
  }

  console.log(missingTransactions.length);
  await writeMissingTransactionsToCSV(missingTransactions);
  return missingTransactions;
}

getMissingShopifyTransactions();
