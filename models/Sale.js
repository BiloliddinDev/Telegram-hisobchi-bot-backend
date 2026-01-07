const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
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
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    customerName: {
      type: String,
      default: "",
    },
    customerPhone: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true, // for sorting by timestamp
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true, // for sorting by creation date
    },
  },
  {
    timestamps: true,
  },
);

saleSchema.index({ seller: 1, product: 1 });

module.exports = mongoose.model("Sale", saleSchema);
