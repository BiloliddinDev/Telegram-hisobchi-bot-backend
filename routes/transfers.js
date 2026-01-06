const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Transfer = require("../models/Transfer");
const Product = require("../models/Product");
const User = require("../models/User");
const SellerProduct = require("../models/SellerProduct");
const { authenticate, isAdmin } = require("../middleware/auth");
const { transferStock } = require("./utils");

router.use(authenticate);
router.use(isAdmin);

// Get transfer history
router.get("/", async (req, res) => {
  try {
    const transfers = await Transfer.find()
      .populate("sellerId", "username firstName lastName")
      .populate("productId", "name sku")
      .sort({ createdAt: -1 });
    res.json({ transfers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new transfer(s)
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { sellerId, items } = req.body; // items: [{ productId, quantity }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array is required" });
    }

    // Validate seller exists
    const seller = await User.findById(sellerId);
    if (!seller || seller.role !== "seller") {
      return res.status(404).json({ error: "Sotuvchi topilmadi" });
    }

    const createdTransfers = [];

    await session.withTransaction(async () => {
      // Extract product IDs
      const productIds = items.map((item) => item.productId);

      // Get products
      const products = await Product.find({
        _id: { $in: productIds },
      }).session(session);

      // Turn to map
      const productMap = new Map(products.map((p) => [p._id.toString(), p]));

      // Validate products exist
      if (products.length !== productIds.length) {
        throw new Error("One or more products not found");
      }

      // Process each item in the transfer
      for (const item of items) {
        const { productId, quantity } = item;

        if (!quantity || quantity <= 0) {
          throw new Error(`Invalid quantity for product ${productId}`);
        }

        // Get product from map
        const product = productMap.get(productId.toString());

        // Check warehouse stock availability
        if (product.warehouseQuantity < quantity) {
          throw new Error(
            `Omborda yetarli mahsulot yo'q: ${product.name}. Mavjud: ${product.warehouseQuantity}, So'ralgan: ${quantity}`,
          );
        }

        // Check if seller-product relationship exists
        let sellerProduct = await SellerProduct.findBySellerAndProduct(
          seller._id,
          product._id,
        ).session(session);

        // If relationship doesn't exist or is inactive, create/activate it
        if (!sellerProduct) {
          sellerProduct = (
            await SellerProduct.create(
              [
                {
                  sellerId: seller._id,
                  productId: product._id,
                  isActive: true,
                  assignAt: new Date(),
                  unassignAt: null,
                },
              ],
              { session },
            )
          )[0];
        } else if (!sellerProduct.isActive) {
          // Reactivate if it was previously unassigned
          await sellerProduct.assign(true, session);
        }

        // Transfer stock from warehouse to seller using utility function
        await transferStock(seller._id, product._id, quantity, session);

        // Create transfer record
        const transfer = (
          await Transfer.create(
            [
              {
                sellerId: seller._id,
                productId: product._id,
                quantity: quantity,
                type: "transfer",
                status: "completed",
              },
            ],
            { session },
          )
        )[0];
        createdTransfers.push(transfer);
      }
    });

    // Populate transfer details for response
    const populatedTransfers = await Transfer.find({
      _id: { $in: createdTransfers.map((t) => t._id) },
    })
      .populate("sellerId", "username firstName lastName")
      .populate("productId", "name sku");

    res.status(201).json({
      message: "Successfully created transfers",
      transfers: populatedTransfers,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

module.exports = router;
