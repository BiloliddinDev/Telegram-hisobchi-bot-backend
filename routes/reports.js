const express = require("express");
const router = express.Router();
const Sale = require("../models/Sale");
const { authenticate } = require("../middleware/auth");

// Get reports
router.get("/", authenticate, async (req, res) => {
  try {
    const { year, month, sellerId } = req.query;

    let query = {};

    // Sellers can only see their own reports
    if (req.user.role === "seller") {
      query.sellerId = req.user._id;
    } else if (sellerId) {
      query.sellerId = sellerId;
    }

    const startDate = new Date(
      year || new Date().getFullYear(),
      (month || new Date().getMonth()) - 1,
      1,
    );
    const endDate = new Date(
      year || new Date().getFullYear(),
      month || new Date().getMonth(),
      0,
      23,
      59,
      59,
    );

    query.timestamp = { $gte: startDate, $lte: endDate };

    const sales = await Sale.find(query)
      .populate("seller", "username firstName lastName")
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
