const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  costPrice: {
    type: Number,
    default: 0,
    min: 0,
  },
  category: {
    type: String,
    default: "general",
  },
  sku: {
    type: String,
    default: "",
  },
  color: {
    type: String,
    default: "",
  },
  count: {
    type: Number,
    default: 0,
    min: 0,
  },
  sellerStocks: [
    {
      sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      quantity: {
        type: Number,
        default: 0,
      },
    },
  ],
  image: {
    type: String,
    default: "",
  },
  assignedSellers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

productSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Product", productSchema);

