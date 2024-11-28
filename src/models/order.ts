import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
    strict: false,
    collection: "orders",
    minimize: false,
  }
);

orderSchema.index({ id: 1 });
orderSchema.index({ platform_id: 1 });
orderSchema.index({ status: 1 });

export const Order = mongoose.model("Order", orderSchema);
