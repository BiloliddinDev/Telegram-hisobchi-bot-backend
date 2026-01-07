const express = require("express");
const router = express.Router();
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const SellerStock = require("../models/SellerStock");
const { authenticate, isAdmin } = require("../middleware/auth");
const { validateSale } = require("../middleware/validation");

// Create sale
router.post("/", authenticate, validateSale, async (req, res) => {
  try {
    const { productId, quantity, price, customerName, customerPhone, notes } =
      req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if seller has access to this productId
    if (req.user.role === "seller") {
      const hasAccess = req.user.assignedProducts.some(
        (id) => id.toString() === productId,
      );
      if (!hasAccess) {
        return res
          .status(403)
          .json({ error: "You do not have access to this productId" });
      }
    }

    // Check count
    if (req.user.role === "seller") {
      const sellerStock = await SellerStock.findBySellerAndProduct(
        req.user._id,
        productId,
      );
      if (!sellerStock || sellerStock.quantity < quantity) {
        return res.status(400).json({ error: "Sizda yetarli mahsulot yo'q" });
      }
    } else if (product.count < quantity) {
      return res.status(400).json({ error: "Omborda yetarli mahsulot yo'q" });
    }

    const totalAmount = price * quantity;

    const sale = await Sale.create({
      sellerId: req.user._id,
      productId: productId,
      quantity,
      price,
      totalAmount,
      customerName,
      customerPhone,
      notes,
    });

    // Update stocks
    if (req.user.role === "seller") {
      const sellerStock = await SellerStock.findBySellerAndProduct(
        req.user._id,
        productId,
      );
      if (sellerStock) {
        await sellerStock.updateQuantity(-quantity);
      }
    } else {
      await Product.findByIdAndUpdate(productId, {
        $inc: { count: -quantity },
      });
    }

    const populatedSale = await Sale.findById(sale._id)
      .populate("product", "name price image")
      .populate("seller", "username firstName lastName");

    res.status(201).json({ sale: populatedSale });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all sales (admin only)
router.get("/", authenticate, async (req, res) => {
  try {
    let query = {};

    // Sellers can only see their own sales
    if (req.user.role === "seller") {
      query.sellerId = req.user._id;
    }

    const { startDate, endDate } = req.query;
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
router.get("/:id", authenticate, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("seller", "username firstName lastName")
      .populate("product", "name price image");

    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    // Sellers can only see their own sales
    if (
      req.user.role === "seller" &&
      sale.seller._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ sale });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
