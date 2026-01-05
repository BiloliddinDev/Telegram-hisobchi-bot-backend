const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Transfer = require("../models/Transfer");
const Product = require("../models/Product");
const User = require("../models/User");
const SellerStock = require("../models/SellerStock");
const SellerProduct = require("../models/SellerProduct");
const { authenticate, isAdmin } = require("../middleware/auth");
const { createSellerProduct, transferStock } = require("./utils");

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
      // Process each item in the transfer
      for (const item of items) {
        const { productId, quantity } = item;

        if (!quantity || quantity <= 0) {
          throw new Error(`Invalid quantity for product ${productId}`);
        }

        // Find and validate product
        const product = await Product.findById(productId).session(session);
        if (!product) {
          throw new Error(`Mahsulot topilmadi: ${productId}`);
        }

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
          sellerProduct = await SellerProduct.create(
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
          );
          sellerProduct = sellerProduct[0];
        } else if (!sellerProduct.isActive) {
          // Reactivate if it was previously unassigned
          await sellerProduct.assign(true, session);
        }

        // Transfer stock from warehouse to seller using utility function
        await transferStock(seller._id, product._id, quantity, session);

        // Create transfer record
        const transfer = await Transfer.create(
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
        );
        createdTransfers.push(transfer[0]);
      }
    });

    await session.endSession();

    // Populate transfer details for response
    const populatedTransfers = await Transfer.find({
      _id: { $in: createdTransfers.map((t) => t._id) },
    })
      .populate("sellerId", "username firstName lastName")
      .populate("productId", "name sku");

    res.status(201).json({
      message: "Muvaffaqiyatli biriktirildi",
      transfers: populatedTransfers,
    });
  } catch (error) {
    await session.endSession();
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
