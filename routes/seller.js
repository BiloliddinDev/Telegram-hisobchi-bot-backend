const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const { authenticate, isSeller } = require("../middleware/auth");

// All sellerId routes require authentication and sellerId role
router.use(authenticate);
router.use(isSeller);

// Get sellerId's assigned products
router.get("/products", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("assignedProducts");
    res.json({ products: user.assignedProducts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sellerId's sales
router.get("/sales", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { sellerId: req.user._id };

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const sales = await Sale.find(query)
      .populate("productId", "name price image")
      .sort({ timestamp: -1 });

    res.json({ sales });
  } catch (error) {
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
      sellerId: req.user._id,
      timestamp: { $gte: startDate, $lte: endDate },
    })
      .populate("productId", "name price")
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

