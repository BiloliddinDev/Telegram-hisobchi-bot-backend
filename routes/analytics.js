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
      .populate("product", "name price costPrice image")
      .populate("seller", "username firstName lastName")
      .sort({ timestamp: -1 });

    // --- Inventory hisob ---
    let warehouseStockValue = 0;
    let sellerStockValue = 0;

    // Omborxona qiymati (product.warehouseQuantity * costPrice)
    products.forEach((product) => {
      warehouseStockValue +=
        (product.warehouseQuantity || 0) * (product.costPrice || 0);
    });

    // Sotuvchilardagi zaxira qiymati
    const sellerDistribution = sellers.map((seller) => ({
      _id: seller._id,
      username: seller.username,
      firstName: seller.firstName,
      lastName: seller.lastName,
      telegramId: seller.telegramId,
      stockValue: 0,
      productCount: 0,
    }));

    sellerStocks.forEach((stock) => {
      if (stock.product && stock.seller) {
        const val = (stock.quantity || 0) * (stock.product.costPrice || 0);
        sellerStockValue += val;

        const sellerData = sellerDistribution.find(
          (s) => s._id.toString() === stock.seller._id.toString(),
        );
        if (sellerData) {
          sellerData.stockValue += val;
          sellerData.productCount += stock.quantity;
        }
      }
    });

    const totalInventoryValue = warehouseStockValue + sellerStockValue;

    // --- Savdo hisob (Sof Foyda) ---
    // totalAmount  = chegirma kiritilgan real tushum
    // costPrice * quantity = tan narxi xarajati
    // netProfit = totalAmount - costPrice * quantity
    let totalRevenue = 0;
    let totalCost = 0;
    let totalDebt = 0;
    let totalPaid = 0;

    let totalReturned = 0;

    sales.forEach((sale) => {
      if (sale.status === "returned") {
        totalReturned++;
        return; // qaytarilgan sotuvlar hisobga olinmaydi
      }
      totalRevenue += sale.totalAmount || 0;
      totalCost += (sale.costPrice || 0) * (sale.quantity || 0);
      totalDebt += sale.debt || 0;
      totalPaid += sale.paidAmount || 0;
    });

    const netProfit = totalRevenue - totalCost;

    res.json({
      summary: {
        // Savdo
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        totalDebt: Math.round(totalDebt * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalSales: sales.length - totalReturned,
        totalReturned,
        // Inventar
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        warehouseStockValue: Math.round(warehouseStockValue * 100) / 100,
        sellerStockValue: Math.round(sellerStockValue * 100) / 100,
      },
      sellers: sellerDistribution,
      sales,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
