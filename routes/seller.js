const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const SellerStock = require("../models/SellerStock");
const SellerProduct = require("../models/SellerProduct");
const { authenticate, isSeller } = require("../middleware/auth");
const { getActiveAssignedStocksForSeller } = require("./utils");

// All sellerId routes require authentication and sellerId role
router.use(authenticate);
router.use(isSeller);

// Get sellerId's assigned products
router.get("/products", async (req, res) => {
  try {
    const products = await SellerProduct.find({
      sellerId: req.user._id,
      isActive: true,
    })
      .populate("product")
      .select("product assignAt");
    res.json({ products: products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get seller's stock inventory (ACTIVE ASSIGNMENTS ONLY)
router.get("/stocks", async (req, res) => {
  try {
    const assignedStocks = await getActiveAssignedStocksForSeller(req.user._id);

    // Calculate total stock value
    const totalStockValue = assignedStocks.reduce((total, row) => {
      return total + (row.stock?.quantity || 0) * (row.product?.costPrice || 0);
    }, 0);

    const totalProducts = assignedStocks.length;
    const totalQuantity = assignedStocks.reduce(
      (total, row) => total + (row.stock?.quantity || 0),
      0
    );

    res.json({
      sellerStocks: assignedStocks,
      summary: {
        totalProducts,
        totalQuantity,
        totalStockValue,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stock for a specific product
router.get("/stocks/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const stock = await SellerStock.findBySellerAndProduct(
      req.user._id,
      productId
    );

    if (!stock) {
      return res
        .status(404)
        .json({ error: "Stock not found for this product" });
    }

    await stock.populate("product", "name sku price costPrice image");

    res.json({ stock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sellerId's sales
router.get("/sales", async (req, res) => {
  try {
    const { start, end } = req.query;
    const query = { seller: req.user._id };

    if (start && end) {
      const startDate = new Date(`${start}T00:00:00.000Z`);
      const endDate = new Date(`${end}T23:59:59.999Z`);

      query.timestamp = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const sales = await Sale.find(query)
      .populate("product", "name price image")
      .sort({ timestamp: -1 });

    res.json({ sales });
  } catch (error) {
    console.error("Sales Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get sellerId's reports
router.get("/reports", async (req, res) => {
  try {
    const { year, month } = req.query;
    const startDate = new Date(
      year || new Date().getFullYear(),
      (month || new Date().getMonth()) - 1,
      1
    );
    const endDate = new Date(
      year || new Date().getFullYear(),
      month || new Date().getMonth(),
      0,
      23,
      59,
      59
    );

    const sales = await Sale.find({
      seller: req.user._id,
      timestamp: { $gte: startDate, $lte: endDate },
    })
      .populate("product", "name price")
      .sort({ timestamp: -1 });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);

    res.json({
      period: { startDate, endDate },
      summary: {
        totalSales,
        totalRevenue,
        totalQuantity,
      },
      sales,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
