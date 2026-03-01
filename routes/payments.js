const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");
const Sale = require("../models/Sale");
const Customer = require("../models/Customer");
const { authenticate, isSeller } = require("../middleware/auth");
const mongoose = require("mongoose");

router.use(authenticate);
router.use(isSeller);

// To'lov qabul qilish
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { orderId, amount, notes } = req.body;

    if (!orderId || !amount || amount <= 0) {
      return res.status(400).json({ error: "orderId va amount majburiy" });
    }

    // Shu orderIdga tegishli barcha sotuvlarni topish
    const sales = await Sale.find({
      orderId,
      seller: req.user._id,
    });

    if (!sales.length) {
      return res.status(404).json({ error: "Order topilmadi" });
    }

    // Jami qarz hisoblash
    const totalDebt = sales.reduce((sum, s) => sum + s.debt, 0);

    if (amount > totalDebt) {
      return res.status(400).json({
        error: `Qarz ${totalDebt}$ — undan ko'p to'lab bo'lmaydi`,
      });
    }

    await session.withTransaction(async () => {
      // Payment yaratish
      await Payment.create(
        [
          {
            sale: sales[0]._id,
            seller: req.user._id,
            customer: sales[0].customer || null,
            amount,
            notes: notes || "",
          },
        ],
        { session },
      );

      // Har bir sotuvda qarzni kamaytirish
      let remaining = amount;
      for (const sale of sales) {
        if (remaining <= 0) break;
        const pay = Math.min(remaining, sale.debt);
        sale.debt -= pay;
        sale.paidAmount += pay;
        sale.isDebt = sale.debt > 0;
        remaining -= pay;
        await sale.save({ session });
      }

      // Customer totalDebt yangilash
      if (sales[0].customer) {
        await Customer.findByIdAndUpdate(
          sales[0].customer,
          { $inc: { totalDebt: -amount } },
          { session },
        );
      }
    });

    res.status(201).json({ message: "To'lov qabul qilindi" });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    const totalAmount = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPaid = sales.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalDebt = sales.reduce((sum, s) => sum + s.debt, 0);

    res.json({ totalAmount, totalPaid, totalDebt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
