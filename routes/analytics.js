const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User");
const Sale = require("../models/Sale");
const SellerStock = require("../models/SellerStock");
const { authenticate, isAdmin } = require("../middleware/auth");
const SaleService = require("../utils/saleService");

router.get("/", authenticate, isAdmin, async (req, res) => {
  try {
    const { start, end } = req.query;

    // --- Build sales query with optional date filtering ---
    const salesQuery = {};
    if (start && end) {
      const startDate = new Date(`${start}T00:00:00.000Z`);
      const endDate = new Date(`${end}T23:59:59.999Z`);
      if (isNaN(startDate) || isNaN(endDate)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      salesQuery.timestamp = { $gte: startDate, $lte: endDate };
    }

    const products = await Product.find();
    const sellers = await User.find({ role: "seller" }).select(
      "username firstName lastName telegramId",
    );
    const sellerStocks = await SellerStock.find()
      .populate("seller", "username firstName lastName telegramId")
      .populate("product", "name costPrice");

    const sales = await Sale.find(salesQuery)
      .populate("product", "name price costPrice image")
      .populate("seller", "username firstName lastName")
      .sort({ timestamp: -1 });

    // --- Inventory hisob (cents-based to avoid float drift) ---
    let warehouseStockValueCents = 0;
    let sellerStockValueCents = 0;

    // Omborxona qiymati (product.warehouseQuantity * costPrice)
    products.forEach((product) => {
      warehouseStockValueCents +=
        (product.warehouseQuantity || 0) * SaleService.toCents(product.costPrice || 0);
    });

    // Sotuvchilardagi zaxira qiymati — O(1) Map lookup instead of O(n) array.find
    const sellerMap = new Map();
    const sellerDistribution = sellers.map((seller) => {
      const entry = {
        _id: seller._id,
        username: seller.username,
        firstName: seller.firstName,
        lastName: seller.lastName,
        telegramId: seller.telegramId,
        stockValueCents: 0,
        productCount: 0,
      };
      sellerMap.set(seller._id.toString(), entry);
      return entry;
    });

    sellerStocks.forEach((stock) => {
      if (stock.product && stock.seller) {
        const valCents = (stock.quantity || 0) * SaleService.toCents(stock.product.costPrice || 0);
        sellerStockValueCents += valCents;

        const sellerData = sellerMap.get(stock.seller._id.toString());
        if (sellerData) {
          sellerData.stockValueCents += valCents;
          sellerData.productCount += stock.quantity;
        }
      }
    });

    const totalInventoryValueCents = warehouseStockValueCents + sellerStockValueCents;

    // --- Savdo hisob (Sof Foyda) — all in cents ---
    let totalRevenueCents = 0;
    let totalCostCents = 0;
    let totalDebtCents = 0;
    let totalPaidCents = 0;
    let totalReturned = 0;

    sales.forEach((sale) => {
      if (sale.status === "returned") {
        totalReturned++;
        return; // qaytarilgan sotuvlar hisobga olinmaydi
      }
      totalRevenueCents += SaleService.toCents(sale.totalAmount || 0);

      // Prefer sale-level costPrice; fall back to populated product costPrice
      const costPrice = sale.costPrice || sale.product?.costPrice || 0;
      totalCostCents += SaleService.toCents(costPrice) * (sale.quantity || 0);

      totalDebtCents += SaleService.toCents(sale.debt || 0);
      totalPaidCents += SaleService.toCents(sale.paidAmount || 0);
    });

    const netProfitCents = totalRevenueCents - totalCostCents;

    // Convert seller distribution values to dollars for response
    const sellersResponse = sellerDistribution.map((s) => ({
      _id: s._id,
      username: s.username,
      firstName: s.firstName,
      lastName: s.lastName,
      telegramId: s.telegramId,
      stockValue: SaleService.toDollar(s.stockValueCents),
      productCount: s.productCount,
    }));

    res.json({
      summary: {
        // Savdo
        totalRevenue: SaleService.toDollar(totalRevenueCents),
        totalCost: SaleService.toDollar(totalCostCents),
        netProfit: SaleService.toDollar(netProfitCents),
        totalDebt: SaleService.toDollar(totalDebtCents),
        totalPaid: SaleService.toDollar(totalPaidCents),
        totalSales: sales.length - totalReturned,
        totalReturned,
        // Inventar
        totalInventoryValue: SaleService.toDollar(totalInventoryValueCents),
        warehouseStockValue: SaleService.toDollar(warehouseStockValueCents),
        sellerStockValue: SaleService.toDollar(sellerStockValueCents),
      },
      sellers: sellersResponse,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
