const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Sale = require("../models/Sale");
const Payment = require("../models/Payment");
const SaleService = require("../utils/saleService");
const { authenticate, isSeller } = require("../middleware/auth");

router.use(authenticate);
router.use(isSeller);

// 1. Barcha qarzdor mijozlar
router.get("/", async (req, res) => {
  try {
    const customers = await Customer.find({
      seller: req.user._id,
      totalDebt: { $gt: 0 },
    }).sort({ totalDebt: -1 });

    const totalDebt = SaleService.toDollar(
      customers.reduce((sum, c) => sum + SaleService.toCents(c.totalDebt), 0),
    );

    res.json({ customers, totalDebt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Mijoz detail + xaridlar tarixi
router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      seller: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({ error: "Mijoz topilmadi" });
    }

    const sales = await Sale.find({
      customer: customer._id,
      seller: req.user._id,
    })
      .populate("product", "name sku price image")
      .sort({ timestamp: -1 });

    // orderId bo'yicha guruhlash
    const groupsMap = {};
    for (const sale of sales) {
      const key = sale.orderId || sale._id.toString();

      if (!groupsMap[key]) {
        groupsMap[key] = {
          orderId: key,
          timestamp: sale.timestamp,
          items: [],
          totalAmount: 0,
          paidAmount: 0,
          debt: 0,
          discountPercent: sale.discountPercent || 0,
          status: sale.status,
          dueDate: sale.dueDate,
        };
      }

      groupsMap[key].items.push({
        _id: sale._id,
        product: sale.product,
        quantity: sale.quantity,
        price: sale.price,
        totalAmount: sale.totalAmount,
      });

      // Cent bilan yig'ish — keyin dollarga o'tkazamiz
      groupsMap[key].totalAmount = SaleService.toDollar(
        SaleService.toCents(groupsMap[key].totalAmount) +
          SaleService.toCents(sale.totalAmount),
      );
      groupsMap[key].paidAmount = SaleService.toDollar(
        SaleService.toCents(groupsMap[key].paidAmount) +
          SaleService.toCents(sale.paidAmount),
      );
      groupsMap[key].debt = SaleService.toDollar(
        SaleService.toCents(groupsMap[key].debt) +
          SaleService.toCents(sale.debt || 0),
      );
    }

    const orders = Object.values(groupsMap).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );

    const payments = await Payment.find({
      customer: customer._id,
      seller: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({ customer, orders, payments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. To'lov qabul qilish
router.post("/:id/payment", async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { amount, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "To'lov summasi noto'g'ri" });
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      seller: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({ error: "Mijoz topilmadi" });
    }

    // Cent bilan tekshirish
    const amountCents = SaleService.toCents(Number(amount));
    const totalDebtCents = SaleService.toCents(customer.totalDebt);

    if (amountCents > totalDebtCents) {
      return res.status(400).json({
        error: `Qarz ${customer.totalDebt}$ dan ko'p to'lab bo'lmaydi`,
      });
    }

    await session.withTransaction(async () => {
      // Payment yaratish
      await Payment.create(
        [
          {
            seller: req.user._id,
            customer: customer._id,
            amount: SaleService.toDollar(amountCents),
            notes: notes || "",
          },
        ],
        { session },
      );

      // Customer qarzini kamaytirish
      const newTotalDebt = SaleService.toDollar(totalDebtCents - amountCents);
      await Customer.findByIdAndUpdate(
        customer._id,
        { $set: { totalDebt: newTotalDebt } },
        { session },
      );

      // Sale lardagi qarzni kamaytirish (eski → yangi tartibda)
      const debtSales = await Sale.find({
        customer: customer._id,
        seller: req.user._id,
        debt: { $gt: 0 },
      })
        .session(session)
        .sort({ timestamp: 1 });

      let remainingCents = amountCents;

      for (const sale of debtSales) {
        if (remainingCents <= 0) break;

        const saleDebtCents = SaleService.toCents(sale.debt);
        const payAmountCents = Math.min(remainingCents, saleDebtCents);

        const newDebt = SaleService.toDollar(saleDebtCents - payAmountCents);
        const newPaid = SaleService.toDollar(
          SaleService.toCents(sale.paidAmount) + payAmountCents,
        );

        await Sale.findByIdAndUpdate(
          sale._id,
          {
            debt: newDebt,
            paidAmount: newPaid,
            status: newDebt === 0 ? "paid" : "partial",
            isDebt: newDebt > 0,
          },
          { session },
        );

        remainingCents -= payAmountCents;
      }
    });

    const updatedCustomer = await Customer.findById(customer._id);

    res.status(201).json({
      message: "To'lov qabul qilindi",
      totalDebt: updatedCustomer.totalDebt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

// 4. To'lovlar tarixi
router.get("/:id/payments", async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      seller: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({ error: "Mijoz topilmadi" });
    }

    const payments = await Payment.find({
      customer: customer._id,
      seller: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({ payments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
