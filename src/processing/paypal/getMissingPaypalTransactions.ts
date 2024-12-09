import { existsSync, mkdirSync } from "fs";
import { initializeDB } from "../../db";
import { Transaction } from "../../models/transaction";

async function writeMissingTransactionsToCSV(missingTransactions: any[]) {
  if (!existsSync("reports")) {
    mkdirSync("reports");
  }
  const file = Bun.file("reports/missing_paypal_transactions.csv");
  const writer = file.writer();

  writer.write("paypalTransactionId,type,status,date\n");

  for (const tx of missingTransactions) {
    const row = [
      tx.platform_data.receipt.transaction_id ||
        tx.platform_data.receipt.refund_transaction_id,
      tx.type,
      tx.status,
      tx.date,
    ].join(",");

    writer.write(row + "\n");
  }

  writer.end();
}

/**
 * This function will get all shopify ghost transactions that are from paypal and will check if there is a paypal transaction for that shopify transaction
 * @returns writes a csv file with the missing transaction IDs
 */
async function getMissingPaypalTransactions() {
  await initializeDB();

  const BATCH_SIZE = 500;
  const missingTransactions: any[] = [];
  let skip = 0;

  while (true) {
    const paypalBatch = (await Transaction.find({
      gateway: "paypal",
      status: "success",
    })
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean()) as any;

    if (paypalBatch.length === 0) break;

    for (const paypalTx of paypalBatch) {
      if (!paypalTx.platform_data.receipt) {
        console.log("No receipt", paypalTx.platform_id);
        continue;
      }

      let potentialPaypalId =
        paypalTx.platform_data.receipt.transaction_id ||
        paypalTx.platform_data.receipt.refund_transaction_id;

      const matchingShopifyTx = await Transaction.findOne({
        gateway: "Payflow Gateway",
        $or: [
          {
            platform_id: potentialPaypalId,
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

getMissingPaypalTransactions();
