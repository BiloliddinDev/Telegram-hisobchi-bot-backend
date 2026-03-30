const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Customer = require("../models/Customer");
const User = require("../models/User");
const SaleService = require("../utils/saleService");
const { authenticate } = require("../middleware/auth");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// 1. Asosiy hisobot
router.get("/", authenticate, async (req, res) => {
  try {
    const { year, month, sellerId } = req.query;

    let query = {};

    if (req.user.role === "seller") {
      query.seller = req.user._id;
    } else if (sellerId) {
      if (!isValidObjectId(sellerId)) {
        return res.status(400).json({ error: "Invalid seller ID format" });
      }
      query.seller = sellerId;
    }

    // Parse and validate year/month
    const now = new Date();
    const parsedYear = year ? parseInt(year) : now.getFullYear();
    // User sends 1-indexed month (1=Jan), default to current month (1-indexed)
    const parsedMonth = month ? parseInt(month) : now.getMonth() + 1;

    if (
      isNaN(parsedYear) ||
      isNaN(parsedMonth) ||
      parsedMonth < 1 ||
      parsedMonth > 12
    ) {
      return res.status(400).json({
        error: "Invalid year or month. Month must be 1-12.",
      });
    }

    // JS Date month is 0-indexed: parsedMonth-1 converts 1-indexed to 0-indexed
    const startDate = new Date(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0);
    // Day 0 of the NEXT month = last day of the target month
    const endDate = new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999);

    query.timestamp = { $gte: startDate, $lte: endDate };

    const sales = await Sale.find(query)
      .populate("seller", "username firstName lastName")
      .populate("product", "name price")
      .sort({ timestamp: -1 });

    // Cent bilan hisoblash — qaytarilgan sotuvlarni hisobga olmaslik
    let totalRevenueCents = 0;
    let totalDebtCents = 0;
    let totalPaidCents = 0;
    let totalQuantity = 0;
    let totalReturned = 0;

    for (const sale of sales) {
      if (sale.status === "returned") {
        totalReturned++;
        continue;
      }
      totalRevenueCents += SaleService.toCents(sale.totalAmount);
      totalDebtCents += SaleService.toCents(sale.debt || 0);
      totalPaidCents += SaleService.toCents(sale.paidAmount || 0);
      totalQuantity += sale.quantity;
    }

    res.json({
      period: { startDate, endDate },
      summary: {
        totalSales: sales.length - totalReturned,
        totalReturned,
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

