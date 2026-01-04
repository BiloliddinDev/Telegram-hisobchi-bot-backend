const express = require("express");
const router = express.Router();
const Transfer = require("../models/Transfer");
const Product = require("../models/Product");
const User = require("../models/User");
const SellerStock = require("../models/SellerStock");
const { authenticate, isAdmin } = require("../middleware/auth");
const { manageAssingmentSellerAndProduct } = require("./utils");

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
  try {
    const { sellerId, items } = req.body; // items: [{ productId, quantity }]

    const seller = await User.findById(sellerId);
    if (!seller || seller.role !== "seller") {
      return res.status(404).json({ error: "Sotuvchi topilmadi" });
    }

    const createdTransfers = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Mahsulot topilmadi: ${item.productId}`);
      }

      if (product.count < item.quantity) {
        throw new Error(`Omborda yetarli mahsulot yo'q: ${product.name}`);
      }

      // Update productId count
      product.count -= item.quantity;

      // Update seller stock using SellerStock model
      const existingStock = await SellerStock.findBySellerAndProduct(
        sellerId,
        product._id,
      );

      if (existingStock) {
        await existingStock.updateQuantity(item.quantity);
      } else {
        await SellerStock.create({
          seller: sellerId,
          product: product._id,
          quantity: item.quantity,
        });
      }

      // assign product to seller
      await manageAssingmentSellerAndProduct(
        sellerId,
        product._id,
        (isSaveSeller = false),
        (isSaveProduct = true),
        (toAssign = true),
      );

      // Create transfer record
      const transfer = await Transfer.create({
        sellerId: sellerId,
        productId: product._id,
        quantity: item.quantity,
        type: "transfer",
      });
      createdTransfers.push(transfer);
    }

    await seller.save();

    res.status(201).json({
      message: "Muvaffaqiyatli biriktirildi",
      transfers: createdTransfers,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Return transfer
router.post("/:id/return", async (req, res) => {
  try {
    const { quantity } = req.body; // Allow partial returns
    const transfer = await Transfer.findById(req.params.id);

    if (!transfer) {
      return res.status(404).json({ error: "Transfer not found" });
    }

    if (transfer.type === "return") {
      return res.status(400).json({ error: "Cannot return a return transfer" });
    }

    const returnQuantity = quantity || transfer.quantity; // Full return if no quantity specified

    if (returnQuantity > transfer.quantity) {
      return res
        .status(400)
        .json({ error: "Cannot return more than original transfer" });
    }

    const sellerStock = await SellerStock.findBySellerAndProduct(
      transfer.sellerId,
      transfer.productId,
    );

    if (!sellerStock || sellerStock.quantity < returnQuantity) {
      return res.status(400).json({
        error: "Seller doesn't have enough stock to return",
      });
    }

    // Return to warehouse
    const product = await Product.findById(transfer.productId);
    product.count += returnQuantity;
    await product.save();

    // Update seller stock
    await sellerStock.updateQuantity(-returnQuantity);

    // Create return transfer record
    const returnTransfer = await Transfer.create({
      sellerId: transfer.sellerId,
      productId: transfer.productId,
      quantity: returnQuantity,
      type: "return",
      relatedTransfer: transfer._id, // 🆕 Link to original
    });

    res.json({
      message: "Stock returned to warehouse",
      originalTransfer: transfer,
      returnTransfer,
      returnedQuantity: returnQuantity,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
