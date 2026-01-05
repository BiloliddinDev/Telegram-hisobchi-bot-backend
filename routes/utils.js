const User = require("../models/User");
const Product = require("../models/Product");
const SellerProduct = require("../models/SellerProduct");
const SellerStock = require("../models/SellerStock");

async function createSellerProduct(seller, product, isActive = true) {
  const sellerDoc =
    typeof seller === "string" ? await User.findById(seller) : seller;

  const productDoc =
    typeof product === "string" ? await Product.findById(product) : product;

  if (!sellerDoc || !productDoc) {
    throw new Error("Seller or product not found");
  }

  const existing = await SellerProduct.findOne({
    sellerId: sellerDoc._id,
    productId: productDoc._id,
  });

  if (existing) {
    if (!existing.isActive && isActive) {
      existing.assign(true, null);
    }
    return existing;
  }

  const newSellerProduct = await SellerProduct.create({
    sellerId: sellerDoc._id,
    productId: productDoc._id,
    isActive,
    assignAt: new Date(),
    unassignAt: null,
  });

  return newSellerProduct;
}

async function inactivateSellerProduct(sellerId, productId, session) {
  const sellerProduct = await SellerProduct.findOne({
    sellerId,
    productId,
  });

  if (!sellerProduct) {
    throw new Error("SellerProduct relationship not found");
  }

  // Already inactive → no-op (idempotent)
  if (!sellerProduct.isActive) {
    return sellerProduct;
  }

  const sellerStock = await SellerStock.findOne({
    seller: sellerId,
    product: productId,
  });

  if (sellerStock && sellerStock.quantity > 0) {
    throw new Error("Cannot unassign product while seller has remaining stock");
  }

  await sellerProduct.unassign(true, session);

  return sellerProduct;
}

async function transferStock(sellerId, productId, amount, session) {
  if (amount > 0) {
    // warehouse → seller
    const sellerUpdated = await SellerStock.increaseQuantity(
      sellerId,
      productId,
      amount,
      session,
    );
    if (!sellerUpdated) throw new Error("Seller stock increase failed");

    const warehouseUpdated = await Product.decreaseWarehouseQuantity(
      productId,
      amount,
      session,
    );
    if (!warehouseUpdated) throw new Error("Insufficient warehouse stock");
  } else if (amount < 0) {
    // seller -> warehouse
    const sellerUpdated = await SellerStock.decreaseQuantity(
      sellerId,
      productId,
      Math.abs(amount),
      session,
    );
    if (!sellerUpdated) throw new Error("Seller stock decrease failed");

    const warehouseUpdated = await Product.increaseWarehouseQuantity(
      productId,
      Math.abs(amount),
      session,
    );
    if (!warehouseUpdated)
      throw new Error("Failed to return stock to warehouse");
  }
}

module.exports = {
  createSellerProduct,
  inactivateSellerProduct,
  transferStock,
};
