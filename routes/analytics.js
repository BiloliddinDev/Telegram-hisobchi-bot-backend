const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User");
const Sale = require("../models/Sale");
const { authenticate, isAdmin } = require("../middleware/auth");

router.get("/", authenticate, isAdmin, async (req, res) => {
  try {
    const products = await Product.find().populate("sellerStocks.sellerId", "username firstName lastName");
    const sellers = await User.find({ role: "seller" }).select("username firstName lastName telegramId");
    const sales = await Sale.find()
      .populate("productId")
      .populate("sellerId", "username firstName lastName")
      .sort({ timestamp: -1 });

    let totalInventoryValue = 0;
    let warehouseStockValue = 0;
    let sellerStockValue = 0;

    const sellerDistribution = sellers.map(seller => {
      return {
        _id: seller._id,
        username: seller.username,
        firstName: seller.firstName,
        lastName: seller.lastName,
        telegramId: seller.telegramId,
        totalValue: 0,
        productCount: 0
      };
    });

    products.forEach(product => {
      const warehouseVal = (product.count || 0) * (product.costPrice || 0);
      warehouseStockValue += warehouseVal;

      let productSellerStockVal = 0;
      product.sellerStocks.forEach(ss => {
        const val = (ss.quantity || 0) * (product.costPrice || 0);
        productSellerStockVal += val;

        const sellerData = sellerDistribution.find(s => s._id.toString() === ss.sellerId._id.toString());
        if (sellerData) {
          sellerData.totalValue += val;
          sellerData.productCount += ss.quantity;
        }
      });

      sellerStockValue += productSellerStockVal;
      totalInventoryValue += warehouseVal + productSellerStockVal;
    });

    res.json({
      summary: {
        totalInventoryValue,
        warehouseStockValue,
        sellerStockValue
      },
      sellers: sellerDistribution,
      sales
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
