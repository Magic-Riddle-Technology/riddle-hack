import { format } from "date-fns";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import PDFDocument from "pdfkit";
import { Transaction } from "../../src/models/transaction";

async function getDateRange() {
  console.log("Determining date range...");
  const [earliest] = await Transaction.aggregate([
    { $sort: { created_at: 1 } },
    { $limit: 1 },
  ]);

  const startDate = earliest ? new Date(earliest.created_at) : new Date();
  const endDate = new Date();

  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);
  endDate.setDate(0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

async function generateTransactionSummary() {
  try {
    const startTime = performance.now();
    const unknownTypes = new Set<string>();

    // Ensure directory exists
    const reportDir = "reports";
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir);
    }

    const { startDate, endDate } = await getDateRange();
    console.log(
      `Processing transactions from ${format(
        startDate,
        "MMM yyyy"
      )} to ${format(endDate, "MMM yyyy")}`
    );

    const TRANSACTION_HANDLING = {
      network_cost: "(Subtracted)",
      payment_refund: "(Subtracted)",
      reserved_funds: "(Excluded)",
      stripe_fee: "(Subtracted)",
      refund_failure: "(Added)",
      adjustment: "(Added)",
      charge: "(Added)",
      payment: "(Added)",
      payment_failure_refund: "(Subtracted)",
      payment_reversal: "(Subtracted)",
      payout: "(Excluded)",
      refund: "(Subtracted)",
      stripe_fx_fee: "(Subtracted)",
      tax_fee: "(Subtracted)",
      transfer: "(Excluded)",
      transfer_refund: "(Added)",
    } as const;

    const summary = await Transaction.aggregate([
      {
        $match: {
          created_at: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
            type: "$platform_data.type",
          },
          total: {
            $sum: "$platform_data.amount",
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.type": 1,
        },
      },
    ]);

    console.log(
      `Aggregation complete. Processing ${summary.length} summary records...`
    );

    const monthlyData = new Map<
      string,
      Array<{ type: string; count: number; total: number }>
    >();

    summary.forEach(({ _id, count, total }) => {
      const monthKey = format(new Date(_id.year, _id.month - 1), "yyyy-MM");
      const formattedType =
        _id.type
          ?.replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase()) || "Unknown";

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, []);
      }
      monthlyData.get(monthKey)?.push({
        type: formattedType,
        count,
        total,
      });
    });

    // Generate CSV
    console.log("Generating CSV...");
    const csvFileName = `reports/summary-${format(
      startDate,
      "yyyy-MM"
    )}-to-${format(endDate, "yyyy-MM")}.csv`;
    const csvFile = Bun.file(csvFileName);
    const csvWriter = csvFile.writer();

    csvWriter.write("Month,Type,Count,Total Amount\n");
    for (const [month, transactions] of monthlyData) {
      transactions.forEach(({ type, count, total }) => {
        csvWriter.write(`${month},${type},${count},${formatCurrency(total)}\n`);
      });
    }
    csvWriter.end();
    console.log(`CSV file generated: ${csvFileName}`);

    // Generate PDF
    console.log("Generating PDF...");
    const pdfFileName = `reports/summary-${format(
      startDate,
      "yyyy-MM"
    )}-to-${format(endDate, "yyyy-MM")}.pdf`;
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const pdfStream = createWriteStream(pdfFileName);
    doc.pipe(pdfStream);

    const PAGE_HEIGHT = doc.page.height - 100;
    const ROW_HEIGHT = 25;
    let currentY = 50;

    doc
      .fontSize(20)
      .text("Transaction Summary Report", { align: "center" })
      .fontSize(16)
      .text(
        `${format(startDate, "MMMM yyyy")} to ${format(endDate, "MMMM yyyy")}`,
        { align: "center" }
      )
      .moveDown(2);

    currentY = 150;

    for (const [month, transactions] of monthlyData) {
      const contentHeight = (transactions.length + 3) * ROW_HEIGHT;

      if (currentY + contentHeight > PAGE_HEIGHT) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(16).text(format(new Date(month), "MMMM yyyy"), 50, currentY);
      currentY += ROW_HEIGHT;

      const COLS = {
        type: 50,
        count: 200,
        amount: 350,
        impact: 470,
      };

      doc
        .fontSize(12)
        .text("Transaction Type", COLS.type, currentY, { width: 130 })
        .text("Count", COLS.count, currentY, { align: "right", width: 100 })
        .text("Total Amount", COLS.amount, currentY, {
          align: "right",
          width: 100,
        })
        .text("Impact", COLS.impact, currentY);

      currentY += ROW_HEIGHT;

      doc.moveTo(50, currentY).lineTo(545, currentY).stroke();

      currentY += 10;

      let monthlyTotal = 0;
      let monthlyCount = 0;

      transactions.forEach((transaction) => {
        const type = transaction.type;
        const count = transaction.count;
        const total = transaction.total;

        const normalizedType = type.toLowerCase().replace(/\s+/g, "_");
        const impact =
          TRANSACTION_HANDLING[
            normalizedType as keyof typeof TRANSACTION_HANDLING
          ] || "(Unknown)";

        if (!impact) {
          unknownTypes.add(type);
        }

        doc
          .fontSize(10)
          .text(type, COLS.type, currentY, { width: 180 })
          .text(count.toString(), COLS.count, currentY, {
            align: "right",
            width: 100,
          })
          .text(formatCurrency(total), COLS.amount, currentY, {
            align: "right",
            width: 100,
          })
          .text(impact, COLS.impact, currentY);

        currentY += ROW_HEIGHT;
        monthlyTotal += total;
        monthlyCount += count;
      });

      doc.moveTo(50, currentY).lineTo(545, currentY).stroke();

      currentY += 10;

      doc
        .fontSize(12)
        .text("Monthly Total", COLS.type, currentY)
        .text(monthlyCount.toString(), COLS.count, currentY, {
          align: "right",
          width: 100,
        })
        .text(formatCurrency(monthlyTotal), COLS.amount, currentY, {
          align: "right",
          width: 100,
        });

      currentY += ROW_HEIGHT * 2;
    }

    console.log("\nDetected transaction types:", Array.from(unknownTypes));

    doc.end();
    console.log(`PDF file generated: ${pdfFileName}`);

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`\nProcess completed in ${duration.toFixed(2)} seconds`);

    return {
      monthlyData,
      processingTime: duration,
      totalRecords: summary.length,
    };
  } catch (error) {
    console.error("Error generating summary:", error);
    throw error;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

console.log("Starting transaction summary generation...");
generateTransactionSummary()
  .then(({ totalRecords, processingTime }) => {
    console.log(`\nSummary Statistics:`);
    console.log(`Total Records Processed: ${totalRecords}`);
    console.log(`Processing Time: ${processingTime.toFixed(2)} seconds`);
  })
  .catch((error) => {
    console.error("Error generating summary:", error);
  })
  .finally(() => {
    console.log("Process finished");
  });
