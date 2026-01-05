const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SellerStockSchema = new Schema(
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
      min: 0,
      default: 0,
    },
    lastTransferDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  },
);

// Create compound index for unique seller-product combinations
SellerStockSchema.index({ seller: 1, product: 1 }, { unique: true });

// Index for efficient queries
SellerStockSchema.index({ seller: 1 });
SellerStockSchema.index({ product: 1 });

// Virtual for populated seller info
SellerStockSchema.virtual("sellerInfo", {
  ref: "User",
  localField: "seller",
  foreignField: "_id",
  justOne: true,
});

// Virtual for populated product info
SellerStockSchema.virtual("productInfo", {
  ref: "Product",
  localField: "product",
  foreignField: "_id",
  justOne: true,
});

// Static method to find stock by seller and product
SellerStockSchema.statics.findBySellerAndProduct = function (
  sellerId,
  productId,
) {
  return this.findOne({ seller: sellerId, product: productId });
};

// Static method to get all stocks for a seller
SellerStockSchema.statics.findBySeller = function (sellerId) {
  return this.find({ seller: sellerId }).populate("product");
};

// Static method to get all stocks for a product
SellerStockSchema.statics.findByProduct = function (productId) {
  return this.find({ product: productId }).populate(
    "seller",
    "username firstName lastName telegramId",
  );
};

SellerStockSchema.statics.increaseQuantity = function (
  sellerId,
  productId,
  amount,
  session,
) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  return this.findOneAndUpdate(
    {
      seller: sellerId,
      product: productId,
    },
    {
      $inc: { quantity: amount },
    },
    {
      new: true,
      upsert: true,
      session,
    },
  );
};

SellerStockSchema.statics.decreaseQuantity = function (
  sellerId,
  productId,
  amount,
  session,
) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  return this.findOneAndUpdate(
    {
      seller: sellerId,
      product: productId,
      quantity: { $gte: amount },
    },
    {
      $inc: { quantity: -amount },
    },
    { new: true, session },
  );
};

// Pre-save middleware to update lastTransferDate when quantity changes
SellerStockSchema.pre("save", function (next) {
  if (this.isModified("quantity")) {
    this.lastTransferDate = new Date();
  }
  next();
});

const SellerStock = mongoose.model("SellerStock", SellerStockSchema);

module.exports = SellerStock;
