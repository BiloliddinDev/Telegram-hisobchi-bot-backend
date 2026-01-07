const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["transfer", "return"],
      default: "transfer",
    },
    status: {
      type: String,
      enum: ["completed", "cancelled"],
      default: "completed",
    },
    transferDate: {
      type: Date,
      default: Date.now,
      index: true, // useful for reporting / date range queries
    },
  },
  { timestamps: true },
);
transferSchema.index({ seller: 1, product: 1 }); // all transfers for seller + product
module.exports = mongoose.model("Transfer", transferSchema);
