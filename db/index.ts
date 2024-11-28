import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/chidi";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Successfully connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

const transactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    order_id: String,
    gateway: String,
    gateway_data: mongoose.Schema.Types.Mixed,
    type: String,
    payment_method_type: String,
    status: String,
    amount: Number,
    fee: Number,
    iso_currency_code: String,
    created_at: Date,
    updated_at: Date,
    platform_id: String,
    description: String,
    platform_data: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    strict: false,
    collection: "transactions",
  }
);

transactionSchema.index({ id: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ created_at: 1 });
transactionSchema.index({ platform_id: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ gateway: 1 });
transactionSchema.index({
  created_at: 1,
  "platform_data.type": 1,
  "platform_data.amount": 1,
});

export const Transaction = mongoose.model("Transaction", transactionSchema);

export const saveTransaction = async (transaction: any) => {
  try {
    const doc = new Transaction(transaction);
    await doc.save();
    return doc;
  } catch (err) {
    console.error("Error saving transaction:", err);
    throw err;
  }
};

export const findTransactions = async (query: any = {}) => {
  try {
    return await Transaction.find(query).exec();
  } catch (err) {
    console.error("Error finding transactions:", err);
    throw err;
  }
};

export const aggregateTransactions = async (pipeline: any[]) => {
  try {
    return await Transaction.aggregate(pipeline).exec();
  } catch (err) {
    console.error("Error aggregating transactions:", err);
    throw err;
  }
};

export default mongoose.connection;
