const express = require("express");
const router = express.Router();
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const SellerStock = require("../models/SellerStock");
const { authenticate, isSeller } = require("../middleware/auth");
const { validateSale } = require("../middleware/validation");
const SellerProduct = require("../models/SellerProduct");
const mongoose = require("mongoose");

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(isSeller);

// Create sale
router.post("/", validateSale, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { productId, quantity, price, customerName, customerPhone, notes } =
      req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if seller has access to this productId
    const sellerProductExists = await SellerProduct.findBySellerAndProduct(
      req.user._id,
      productId,
    );
    if (!sellerProductExists) {
      return res
        .status(403)
        .json({ error: "You do not have access to this productId" });
    }

    // Check count
    const sellerStock = await SellerStock.findBySellerAndProduct(
      req.user._id,
      productId,
    );
    if (!sellerStock || sellerStock.quantity < quantity) {
      return res.status(400).json({ error: "Sizda yetarli mahsulot yo'q" });
    }

    const totalAmount = price * quantity;

    await session.withTransaction(async () => {
      await Sale.create(
        [
          {
            seller: req.user._id,
            product: productId,
            quantity,
            price,
            totalAmount,
            customerName,
            customerPhone,
            notes,
          },
        ],
        { session },
      );

      const isDecreased = await SellerStock.decreaseQuantity({
        sellerStock: sellerStock._id,
        amount: Math.abs(quantity),
        session: session,
      });

      if (!isDecreased) {
        throw new Error("Sizda yetarli mahsulot yo'q");
      }
    });

    res.status(201).json({ sale: populatedSale });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

// Get all sales
router.get("/", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};

    query.sellerId = req.user._id;

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const sales = await Sale.find(query)
      .populate("seller", "username firstName lastName")
      .populate("product", "name price image")
      .sort({ timestamp: -1 });

    res.json({ sales });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single sale
router.get("/:id", async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      seller: req.user._id,
    })
      .populate("seller", "username firstName lastName")
      .populate("product", "name price image");

    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    res.json({ sale });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
