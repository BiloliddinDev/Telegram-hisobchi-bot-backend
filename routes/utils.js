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
    seller: sellerDoc._id,
    product: productDoc._id,
  });

  if (existing) {
    if (!existing.isActive && isActive) {
      existing.assign(true, null);
    }
    return existing;
  }

  const newSellerProduct = await SellerProduct.create({
    seller: sellerDoc._id,
    product: productDoc._id,
    isActive,
    assignAt: new Date(),
    unassignAt: null,
  });

  return newSellerProduct;
}

async function inactivateSellerProduct(sellerId, productId, session) {
  const sellerProduct = await SellerProduct.findOne({
    seller: sellerId,
    product: productId,
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

async function transferStock({
  sellerId,
  productId,
  stockId,
  amount,
  session,
}) {
  if (amount > 0) {
    // warehouse → seller
    const sellerUpdated = await SellerStock.increaseQuantity({
      sellerId: sellerId,
      productId: productId,
      stockId: stockId,
      amount: Math.abs(amount),
      session: session,
    });
    if (!sellerUpdated) throw new Error("Seller stock increase failed");

    const warehouseUpdated = await Product.decreaseWarehouseQuantity(
      productId,
      Math.abs(amount),
      session,
    );
    if (!warehouseUpdated) throw new Error("Insufficient warehouse stock");
  } else if (amount < 0) {
    // seller -> warehouse
    const sellerUpdated = await SellerStock.decreaseQuantity({
      sellerId: sellerId,
      productId: productId,
      stockId: stockId,
      amount: Math.abs(amount),
      session: session,
    });
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

async function getAssignedStocks(isActiveInclude = null) {
  const match = {};
  // Only filter by isActive if explicitly provided (true or false)
  if (isActiveInclude !== null && isActiveInclude !== undefined) {
    match.isActive = isActiveInclude;
  }
  const rows = await SellerProduct.aggregate([
    // Filter by isActive if specified, otherwise return all
    ...(Object.keys(match).length > 0 ? [{ $match: match }] : []),

    // Join SellerStock by (seller, product)
    {
      $lookup: {
        from: "sellerstocks",
        let: { sellerId: "$seller", productId: "$product" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$seller", "$$sellerId"] },
                  { $eq: ["$product", "$$productId"] },
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
              quantity: 1,
              updatedAt: 1,
              lastTransferDate: 1,
            },
          },
        ],
        as: "stock",
      },
    },
    { $unwind: { path: "$stock", preserveNullAndEmptyArrays: true } },

    // Join seller (optional but usually needed)
    {
      $lookup: {
        from: "users",
        localField: "seller",
        foreignField: "_id",
        as: "seller",
      },
    },
    { $unwind: "$seller" },

    // Join product (optional but usually needed)
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },

    // Output shape
    {
      $project: {
        _id: 0,
        sellerProductId: "$_id",
        seller: {
          _id: "$seller._id",
          username: "$seller.username",
          firstName: "$seller.firstName",
          lastName: "$seller.lastName",
          phoneNumber: "$seller.phoneNumber",
          avatarUrl: "$seller.avatarUrl",
        },
        product: {
          _id: "$product._id",
          name: "$product.name",
          description: "$product.description",
          sku: "$product.sku",
          price: "$product.price",
          costPrice: "$product.costPrice",
          warehouseQuantity: "$product.warehouseQuantity",
          image: "$product.image",
          isActive: "$product.isActive",
        },
        assignment: {
          isActive: "$isActive",
          assignAt: "$assignAt",
          unassignAt: "$unassignAt",
        },
        stock: {
          _id: "$stock._id",
          quantity: { $ifNull: ["$stock.quantity", 0] },
          lastTransferDate: "$stock.lastTransferDate",
          updatedAt: "$stock.updatedAt",
          createdAt: "$stock.createdAt",
        },
      },
    },
  ]);

  return rows;
}

async function getActiveAssignedStocksForSeller(sellerId) {
  const rows = await SellerProduct.aggregate([
    { $match: { seller: sellerId, isActive: true } },

    // Join SellerStock by (seller, product)
    {
      $lookup: {
        from: "sellerstocks",
        let: { sellerId: "$seller", productId: "$product" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$seller", "$$sellerId"] },
                  { $eq: ["$product", "$$productId"] },
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
              quantity: 1,
              lastTransferDate: 1,
              updatedAt: 1,
              createdAt: 1,
            },
          },
        ],
        as: "stock",
      },
    },
    { $unwind: { path: "$stock", preserveNullAndEmptyArrays: true } },

    // Join Product for richer response
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },

    {
      $project: {
        _id: 0,
        sellerProductId: "$_id",
        product: {
          _id: "$product._id",
          name: "$product.name",
          description: "$product.description",
          sku: "$product.sku",
          price: "$product.price",
          costPrice: "$product.costPrice",
          warehouseQuantity: "$product.warehouseQuantity",
          image: "$product.image",
          isActive: "$product.isActive",
        },
        assignment: {
          isActive: "$isActive",
          assignAt: "$assignAt",
          unassignAt: "$unassignAt",
        },
        stock: {
          _id: "$stock._id",
          quantity: { $ifNull: ["$stock.quantity", 0] },
          lastTransferDate: "$stock.lastTransferDate",
          updatedAt: "$stock.updatedAt",
          createdAt: "$stock.createdAt",
        },
      },
    },
  ]);

  return rows;
}

module.exports = {
  createSellerProduct,
  inactivateSellerProduct,
  transferStock,
  getAssignedStocks,
  getActiveAssignedStocksForSeller,
};
