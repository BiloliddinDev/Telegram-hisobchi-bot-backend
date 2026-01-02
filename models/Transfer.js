const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
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
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transfer", transferSchema);
