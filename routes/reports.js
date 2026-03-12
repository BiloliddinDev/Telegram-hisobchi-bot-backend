const express = require("express");
const router = express.Router();
const Sale = require("../models/Sale");
const Customer = require("../models/Customer");
const User = require("../models/User");
const SaleService = require("../utils/saleService");
const { authenticate } = require("../middleware/auth");

// 1. Asosiy hisobot
router.get("/", authenticate, async (req, res) => {
  try {
    const { year, month, sellerId } = req.query;

    let query = {};

    if (req.user.role === "seller") {
      query.seller = req.user._id;
    } else if (sellerId) {
      query.seller = sellerId;
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

    // Cent bilan hisoblash
    const totalRevenueCents = sales.reduce(
      (sum, sale) => sum + SaleService.toCents(sale.totalAmount),
      0,
    );
    const totalDebtCents = sales.reduce(
      (sum, sale) => sum + SaleService.toCents(sale.debt || 0),
      0,
    );
    const totalPaidCents = sales.reduce(
      (sum, sale) => sum + SaleService.toCents(sale.paidAmount || 0),
      0,
    );
    const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);

    res.json({
      period: { startDate, endDate },
      summary: {
        totalSales: sales.length,
        totalRevenue: SaleService.toDollar(totalRevenueCents),
        totalDebt: SaleService.toDollar(totalDebtCents),
        totalPaid: SaleService.toDollar(totalPaidCents),
        totalQuantity,
      },
      sales,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Jami qarzlar (Admin uchun)
router.get("/debts", authenticate, async (req, res) => {
  try {
    // Faqat admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    // Barcha qarzdor mijozlar
    const customers = await Customer.find({
      totalDebt: { $gt: 0 },
    })
      .populate("seller", "username firstName lastName")
      .sort({ totalDebt: -1 });

    // Seller bo'yicha guruhlash
    const sellerDebtsMap = {};
    for (const customer of customers) {
      const sellerId = customer.seller?._id?.toString();
      if (!sellerId) continue;

      if (!sellerDebtsMap[sellerId]) {
        sellerDebtsMap[sellerId] = {
          seller: customer.seller,
          totalDebt: 0,
          customersCount: 0,
          customers: [],
        };
      }

      sellerDebtsMap[sellerId].totalDebt = SaleService.toDollar(
        SaleService.toCents(sellerDebtsMap[sellerId].totalDebt) +
          SaleService.toCents(customer.totalDebt),
      );
      sellerDebtsMap[sellerId].customersCount += 1;
      sellerDebtsMap[sellerId].customers.push({
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        totalDebt: customer.totalDebt,
        lastPurchase: customer.lastPurchase,
      });
    }

    const sellerDebts = Object.values(sellerDebtsMap).sort(
      (a, b) => b.totalDebt - a.totalDebt,
    );

    // Jami qarz
    const grandTotalDebtCents = customers.reduce(
      (sum, c) => sum + SaleService.toCents(c.totalDebt),
      0,
    );

    res.json({
      grandTotalDebt: SaleService.toDollar(grandTotalDebtCents),
      totalDebtors: customers.length,
      sellerDebts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
