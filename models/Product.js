const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    sku: {
      type: String,
      default: "",
      index: true,
    },
    color: {
      type: String,
      default: "",
    },
    warehouseQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    image: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true, // for sorting by creation date
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

ProductSchema.statics.increaseWarehouseQuantity = function (
  productId,
  amount,
  session,
) {
  if (amount <= 0) {
    throw new Error("Increase amount must be positive");
  }
  return this.findOneAndUpdate(
    {
      _id: productId,
    },
    {
      $inc: { warehouseQuantity: amount },
    },
    { new: true, session },
  );
};

ProductSchema.statics.decreaseWarehouseQuantity = function (
  productId,
  amount,
  session,
) {
  if (amount <= 0) {
    throw new Error("Decrease amount must be positive");
  }
  return this.findOneAndUpdate(
    {
      _id: productId,
      warehouseQuantity: { $gte: amount },
    },
    {
      $inc: { warehouseQuantity: -amount },
    },
    { new: true, session },
  );
};

ProductSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("Product", ProductSchema);
