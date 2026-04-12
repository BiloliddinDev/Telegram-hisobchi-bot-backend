const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const CashTransaction = require("../models/CashTransaction");
const { authenticate, isAdmin } = require("../middleware/auth");
const SaleService = require("../utils/saleService");

router.use(authenticate);
router.use(isAdmin);

// Get cash balance and summary
router.get("/balance", async (req, res) => {
  try {
    const { start, end } = req.query;

    const match = {};
    if (start && end) {
      match.createdAt = {
        $gte: new Date(`${start}T00:00:00.000Z`),
        $lte: new Date(`${end}T23:59:59.999Z`),
      };
    }

    const result = await CashTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalIn = 0;
    let totalOut = 0;
    let totalRashot = 0;
    let totalOylik = 0;
    let countIn = 0;
    let countOut = 0;

    for (const r of result) {
      if (r._id === "in") {
        totalIn = r.total;
        countIn = r.count;
      } else if (r._id === "out") {
        totalOut = r.total;
        countOut = r.count;
      } else if (r._id === "rashot") {
        totalRashot = r.total;
      } else if (r._id === "oylik") {
        totalOylik = r.total;
      }
    }

    const balanceCents =
      SaleService.toCents(totalIn) - SaleService.toCents(totalOut);
    const adminPocketCents =
      SaleService.toCents(totalOut) -
      SaleService.toCents(totalRashot) -
      SaleService.toCents(totalOylik);

    res.json({
      balance: SaleService.toDollar(balanceCents),
      totalIn: SaleService.toDollar(SaleService.toCents(totalIn)),
      totalOut: SaleService.toDollar(SaleService.toCents(totalOut)),
      adminPocket: SaleService.toDollar(adminPocketCents),
      countIn,
      countOut,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transactions list
router.get("/transactions", async (req, res) => {
  try {
    const { start, end, type, page = 1, limit = 50 } = req.query;

    const query = {};

    if (start && end) {
      query.createdAt = {
        $gte: new Date(`${start}T00:00:00.000Z`),
        $lte: new Date(`${end}T23:59:59.999Z`),
      };
    }

    if (type && ["in", "out", "rashot", "oylik"].includes(type)) {
      query.type = type;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      CashTransaction.find(query)
        .populate("performedBy", "username firstName lastName role")
        .populate("relatedSeller", "firstName lastName username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      CashTransaction.countDocuments(query),
    ]);

    res.json({
      transactions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Withdraw cash (admin takes money)
router.post("/withdraw", async (req, res) => {
  try {
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Summa 0 dan katta bo'lishi kerak" });
    }

    if (!description || description.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "Izoh yozish majburiy" });
    }

    // Kassa balansini tekshirish
    const totals = await CashTransaction.aggregate([
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let totalIn = 0;
    let totalOut = 0;
    for (const t of totals) {
      if (t._id === "in") totalIn = t.total;
      else if (t._id === "out") totalOut = t.total;
    }

    const currentBalanceCents =
      SaleService.toCents(totalIn) - SaleService.toCents(totalOut);
    const withdrawCents = SaleService.toCents(amount);

    if (withdrawCents > currentBalanceCents) {
      const currentBalance = SaleService.toDollar(currentBalanceCents);
      return res.status(400).json({
        error: `Kassada yetarli mablag' yo'q. Kassa balansi: ${currentBalance}$`,
      });
    }

    const transaction = await CashTransaction.create({
      type: "out",
      amount: Number(SaleService.toDollar(SaleService.toCents(amount))),
      description: description.trim(),
      performedBy: req.user._id,
    });

    await transaction.populate(
      "performedBy",
      "username firstName lastName role",
    );

    res.status(201).json({
      message: "Kassadan pul muvaffaqiyatli olindi",
      transaction,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin hamyonidan xarajat (rashot / oylik)
router.post("/spend", async (req, res) => {
  try {
    const { amount, type, description, sellerId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Summa 0 dan katta bo'lishi kerak" });
    }

    if (!type || !["rashot", "oylik"].includes(type)) {
      return res.status(400).json({ error: "Tur 'rashot' yoki 'oylik' bo'lishi kerak" });
    }

    if (type === "oylik" && !sellerId) {
      return res.status(400).json({ error: "Oylik uchun sotuvchini tanlash majburiy" });
    }

    // Admin hamyon balansini tekshirish
    const totals = await CashTransaction.aggregate([
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let totalOut = 0;
    let totalRashot = 0;
    let totalOylik = 0;
    for (const t of totals) {
      if (t._id === "out") totalOut = t.total;
      else if (t._id === "rashot") totalRashot = t.total;
      else if (t._id === "oylik") totalOylik = t.total;
    }

    const adminPocketCents =
      SaleService.toCents(totalOut) -
      SaleService.toCents(totalRashot) -
      SaleService.toCents(totalOylik);
    const spendCents = SaleService.toCents(amount);

    if (spendCents > adminPocketCents) {
      const pocket = SaleService.toDollar(adminPocketCents);
      return res.status(400).json({
        error: `Admin hamyonida yetarli mablag' yo'q. Hamyon balansi: ${pocket}$`,
      });
    }

    const [transaction] = await CashTransaction.create([{
      type,
      amount: Number(SaleService.toDollar(SaleService.toCents(amount))),
      description: description ? description.trim() : "",
      performedBy: req.user._id,
      relatedSeller: type === "oylik" ? sellerId : null,
    }]);

    // Race condition tekshiruvi: yozuvdan KEYIN ham balansni qayta tekshiramiz
    const newTotals = await CashTransaction.aggregate([
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);
    let newOut = 0, newRashot = 0, newOylik = 0;
    for (const t of newTotals) {
      if (t._id === "out") newOut = t.total;
      else if (t._id === "rashot") newRashot = t.total;
      else if (t._id === "oylik") newOylik = t.total;
    }
    const newPocketCents =
      SaleService.toCents(newOut) -
      SaleService.toCents(newRashot) -
      SaleService.toCents(newOylik);

    if (newPocketCents < 0) {
      // Kompensatsiya: manfiy ketdi — yozuvni o'chiramiz
      await CashTransaction.findByIdAndDelete(transaction._id);
      return res.status(400).json({
        error: "Admin hamyonida yetarli mablag' yo'q (bir vaqtda bir nechta so'rov). Qayta urinib ko'ring.",
      });
    }

    await transaction.populate("performedBy", "username firstName lastName role");
    await transaction.populate("relatedSeller", "firstName lastName username");

    res.status(201).json({
      message: type === "oylik" ? "Oylik muvaffaqiyatli berildi" : "Rashot qayd etildi",
      transaction,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete transaction (for corrections)
router.delete("/transactions/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Noto'g'ri ID format" });
    }

    const transaction = await CashTransaction.findById(id);

    if (!transaction) {
      return res.status(404).json({ error: "Tranzaksiya topilmadi" });
    }

    // Faqat 'out' (admin olgan pul) tranzaksiyalarni o'chirish mumkin
    if (transaction.type === "in") {
      return res.status(400).json({
        error:
          "Kirim tranzaksiyasini o'chirish mumkin emas. Faqat chiqim (pul olish) o'chiriladi.",
      });
    }

    await CashTransaction.findByIdAndDelete(id);

    res.json({ message: "Tranzaksiya o'chirildi" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
