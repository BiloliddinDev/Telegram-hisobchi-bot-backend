const mongoose = require("mongoose");

const SellerProductSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Seller",
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  assignAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  unassignAt: {
    type: Date,
    default: null,
  },
});

SellerProductSchema.index({ sellerId: 1, productId: 1 }, { unique: true });
SellerProductSchema.index({ sellerId: 1 });
SellerProductSchema.index({ productId: 1 });

// Static method to find stock by seller and product
SellerProductSchema.statics.findBySellerAndProduct = function (
  sellerId,
  productId,
) {
  return this.findOne({ sellerId: sellerId, productId: productId });
};

SellerProductSchema.methods.assign = function (toSave = true, session) {
  this.isActive = true;
  this.assignAt = new Date();
  this.unassignAt = null;
  if (toSave) {
    return this.save({ session });
  }
};

SellerProductSchema.methods.unassign = function (toSave = true, session) {
  this.isActive = false;
  this.unassignAt = Date.now();
  if (toSave) {
    return this.save({ session });
  }
};

const SellerProduct = mongoose.model("SellerProduct", SellerProductSchema);

module.exports = SellerProduct;
