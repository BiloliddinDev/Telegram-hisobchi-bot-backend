const mongoose = require("mongoose");

const cashTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["in", "out", "rashot", "oylik"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    default: "",
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  relatedSale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale",
    default: null,
  },
  relatedSeller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

cashTransactionSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("CashTransaction", cashTransactionSchema);
