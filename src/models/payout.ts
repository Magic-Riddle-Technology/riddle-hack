import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
    strict: false,
    collection: "payouts",
    minimize: false,
  }
);

payoutSchema.index({ id: 1 });
payoutSchema.index({ created_at: 1 });

export const Payout = mongoose.model("Payout", payoutSchema);
