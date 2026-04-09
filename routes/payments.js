const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");
const Sale = require("../models/Sale");
const Customer = require("../models/Customer");
const CashTransaction = require("../models/CashTransaction");
const { authenticate, isSeller } = require("../middleware/auth");
const mongoose = require("mongoose");
const SaleService = require("../utils/saleService");

router.use(authenticate);
router.use(isSeller);

// To'lov qabul qilish
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { orderId, amount, notes } = req.body;
    const parsedAmount = Number(amount);

    if (!orderId || !amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "orderId va amount majburiy" });
    }

    const amountCents = SaleService.toCents(parsedAmount);

    await session.withTransaction(async () => {
      // Fetch sales INSIDE transaction to prevent race conditions
      const sales = await Sale.find({
        orderId,
        seller: req.user._id,
      }).session(session);

      if (!sales.length) {
        throw new Error("Order topilmadi");
      }

      // Jami qarz hisoblash (cents-based)
      const totalDebtCents = sales.reduce(
        (sum, s) => sum + SaleService.toCents(s.debt),
        0,
      );

      if (amountCents > totalDebtCents) {
        throw new Error(
          `Qarz ${SaleService.toDollar(totalDebtCents)}$ — undan ko'p to'lab bo'lmaydi`,
        );
      }

      // Payment yaratish
      await Payment.create(
        [
          {
            sale: sales[0]._id,
            seller: req.user._id,
            customer: sales[0].customer || null,
            amount: SaleService.toDollar(amountCents),
            notes: notes || "",
          },
        ],
        { session },
      );

      // Har bir sotuvda qarzni kamaytirish (cents-based)
      let remainingCents = amountCents;
      for (const sale of sales) {
        if (remainingCents <= 0) break;

        const saleDebtCents = SaleService.toCents(sale.debt);
        const payCents = Math.min(remainingCents, saleDebtCents);

        const newDebt = SaleService.toDollar(saleDebtCents - payCents);
        const newPaid = SaleService.toDollar(
          SaleService.toCents(sale.paidAmount) + payCents,
        );

        sale.debt = newDebt;
        sale.paidAmount = newPaid;
        sale.isDebt = newDebt > 0;
        sale.status = newDebt === 0 ? "paid" : "partial";
        remainingCents -= payCents;
        await sale.save({ session });
      }

      // Kassaga to'lov yozish
      await CashTransaction.create(
        [
          {
            type: "in",
            amount: SaleService.toDollar(amountCents),
            description: `To'lov: ${orderId}`,
            performedBy: req.user._id,
          },
        ],
        { session },
      );

      // Customer totalDebt yangilash (safe: compute exact new value, floor at 0)
      if (sales[0].customer) {
        const customer = await Customer.findById(sales[0].customer).session(
          session,
        );
        if (customer) {
          const customerDebtCents = SaleService.toCents(customer.totalDebt);
          const newCustomerDebt = SaleService.toDollar(
            Math.max(0, customerDebtCents - amountCents),
          );
          await Customer.findByIdAndUpdate(
            customer._id,
            { $set: { totalDebt: newCustomerDebt } },
            { session },
          );
        }
      }
    });

    res.status(201).json({ message: "To'lov qabul qilindi" });
  } catch (error) {
    const status = error.message.includes("topilmadi") || error.message.includes("ko'p") ? 400 : 500;
    res.status(status).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

// Order qarzini ko'rish
router.get("/:orderId", async (req, res) => {
  try {
    const sales = await Sale.find({
      orderId: req.params.orderId,
      seller: req.user._id,
    });

    if (!sales.length) {
      return res.status(404).json({ error: "Order topilmadi" });
    }

    const totalAmount = SaleService.toDollar(
      sales.reduce((sum, s) => sum + SaleService.toCents(s.totalAmount), 0),
    );
    const totalPaid = SaleService.toDollar(
      sales.reduce((sum, s) => sum + SaleService.toCents(s.paidAmount), 0),
    );
    const totalDebt = SaleService.toDollar(
      sales.reduce((sum, s) => sum + SaleService.toCents(s.debt), 0),
    );

    res.json({ totalAmount, totalPaid, totalDebt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

