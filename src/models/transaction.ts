import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
    strict: false,
    collection: "transactions",
    minimize: false,
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
