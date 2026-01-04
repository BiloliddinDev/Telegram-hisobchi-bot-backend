const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User");
const Sale = require("../models/Sale");
const SellerStock = require("../models/SellerStock");
const { authenticate, isAdmin } = require("../middleware/auth");

router.get("/", authenticate, isAdmin, async (req, res) => {
  try {
    const products = await Product.find();
    const sellers = await User.find({ role: "seller" }).select(
      "username firstName lastName telegramId",
    );
    const sellerStocks = await SellerStock.find()
      .populate("seller", "username firstName lastName telegramId")
      .populate("product", "name costPrice");
    const sales = await Sale.find()
      .populate("productId")
      .populate("sellerId", "username firstName lastName")
      .sort({ timestamp: -1 });

    let totalInventoryValue = 0;
    let warehouseStockValue = 0;
    let sellerStockValue = 0;

    const sellerDistribution = sellers.map((seller) => {
      return {
        _id: seller._id,
        username: seller.username,
        firstName: seller.firstName,
        lastName: seller.lastName,
        telegramId: seller.telegramId,
        totalValue: 0,
        productCount: 0,
      };
    });

    // Calculate warehouse stock value
    products.forEach((product) => {
      const warehouseVal = (product.count || 0) * (product.costPrice || 0);
      warehouseStockValue += warehouseVal;
      totalInventoryValue += warehouseVal;
    });

    // Calculate seller stock value
    sellerStocks.forEach((stock) => {
      if (stock.product && stock.seller) {
        const val = (stock.quantity || 0) * (stock.product.costPrice || 0);
        sellerStockValue += val;
        totalInventoryValue += val;

        const sellerData = sellerDistribution.find(
          (s) => s._id.toString() === stock.seller._id.toString(),
        );
        if (sellerData) {
          sellerData.totalValue += val;
          sellerData.productCount += stock.quantity;
        }
      }
    });

    res.json({
      summary: {
        totalInventoryValue,
        warehouseStockValue,
        sellerStockValue,
      },
      sellers: sellerDistribution,
      sales,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
