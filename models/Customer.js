const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    totalDebt: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPurchase: {
      type: Date,
      default: Date.now,
    },
    address: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

customerSchema.index({ seller: 1, phone: 1 }, { unique: true });
customerSchema.index({ name: 1 });
customerSchema.index({ totalDebt: -1 });

module.exports = mongoose.model("Customer", customerSchema);
