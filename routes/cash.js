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

    // ALL-TIME aggregate — actual kassa balance (date filter qo'llanmaydi)
    const allTimeResult = await CashTransaction.aggregate([
      {
        $group: {
          _id: { type: "$type", method: "$paymentMethod" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    let allInCash = 0, allInCard = 0, allOut = 0, allRashot = 0, allOylik = 0, allChiqim = 0;
    let allOutCash = 0, allOutCard = 0, allRashotCash = 0, allRashotCard = 0, allOylikCash = 0, allOylikCard = 0, allChiqimCash = 0, allChiqimCard = 0;

    for (const r of allTimeResult) {
      const { type, method } = r._id;
      const amount = r.total || 0;
      const amountCents = SaleService.toCents(amount);

      if (type === "in") {
        if (method === "card") allInCard += amount;
        else allInCash += amount;
      }
      else if (type === "out") {
        allOut += amount;
        if (method === "card") allOutCard += amountCents;
        else allOutCash += amountCents;
      }
      else if (type === "rashot") {
        allRashot += amount;
        if (method === "card") allRashotCard += amountCents;
        else allRashotCash += amountCents;
      }
      else if (type === "oylik") {
        allOylik += amount;
        if (method === "card") allOylikCard += amountCents;
        else allOylikCash += amountCents;
      }
      else if (type === "chiqim") {
        allChiqim += amount;
        if (method === "card") allChiqimCard += amountCents;
        else allChiqimCash += amountCents;
      }
    }

    // Actual balance for each method - Only 'out' subtracts from Kassa drawer.
    // Expenses (rashot, oylik, chiqim) are paid from the pocket (the 'out' money).
    const cashBalanceCents = SaleService.toCents(allInCash) - allOutCash;
    const cardBalanceCents = SaleService.toCents(allInCard) - allOutCard;
    const totalBalanceCents = cashBalanceCents + cardBalanceCents;

    const adminPocketCents =
      SaleService.toCents(allOut) -
      SaleService.toCents(allRashot) -
      SaleService.toCents(allOylik) -
      SaleService.toCents(allChiqim);
    const totalSpentCents =
      SaleService.toCents(allRashot) +
      SaleService.toCents(allOylik) +
      SaleService.toCents(allChiqim);

    // Period aggregate — tanlanган sana oralig'idagi statistika
    const periodMatch = {};
    if (start && end) {
      periodMatch.createdAt = {
        $gte: new Date(`${start}T00:00:00.000Z`),
        $lte: new Date(`${end}T23:59:59.999Z`),
      };
    }

    const periodResult = await CashTransaction.aggregate([
      { $match: periodMatch },
      {
        $group: {
          _id: { type: "$type", method: "$paymentMethod" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalInCash = 0, totalInCard = 0, totalOut = 0, totalRashot = 0, totalOylik = 0, totalChiqim = 0;
    let countIn = 0, countOut = 0;
    for (const r of periodResult) {
      const { type, method } = r._id;
      const amount = r.total || 0;
      if (type === "in") {
        if (method === "card") totalInCard += amount;
        else totalInCash += amount;
        countIn += r.count;
      }
      else if (type === "out") { totalOut += amount; countOut += r.count; }
      else if (type === "rashot") totalRashot += amount;
      else if (type === "oylik") totalOylik += amount;
      else if (type === "chiqim") totalChiqim += amount;
    }

    res.json({
      balance: SaleService.toDollar(cashBalanceCents), // Hozircha kassa (naqd) balansi asosiy balans sifatida
      cashBalance: SaleService.toDollar(cashBalanceCents),
      cardBalance: SaleService.toDollar(cardBalanceCents),
      totalBalance: SaleService.toDollar(totalBalanceCents),
      adminPocket: SaleService.toDollar(adminPocketCents),
      totalRashot: SaleService.toDollar(SaleService.toCents(allRashot)),
      totalOylik: SaleService.toDollar(SaleService.toCents(allOylik)),
      totalChiqim: SaleService.toDollar(SaleService.toCents(allChiqim)),
      totalSpent: SaleService.toDollar(totalSpentCents),
      // Period stats
      totalIn: SaleService.toDollar(SaleService.toCents(totalInCash) + SaleService.toCents(totalInCard)),
      totalInCash: SaleService.toDollar(SaleService.toCents(totalInCash)),
      totalInCard: SaleService.toDollar(SaleService.toCents(totalInCard)),
      totalOut: SaleService.toDollar(SaleService.toCents(totalOut)),
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

    if (type && ["in", "out", "rashot", "oylik", "chiqim"].includes(type)) {
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

// Manual cash/card in (deposit money to kassa)
router.post("/in", async (req, res) => {
  try {
    const { amount, description, paymentMethod = "cash" } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Summa 0 dan katta bo'lishi kerak" });
    }

    if (!["cash", "card"].includes(paymentMethod)) {
      return res.status(400).json({ error: "paymentMethod: 'cash' yoki 'card' bo'lishi kerak" });
    }

    const transaction = await CashTransaction.create({
      type: "in",
      amount: Number(amount),
      paymentMethod,
      description: description ? description.trim() : `Manual kirim (${paymentMethod === "card" ? "Karta" : "Naqd"})`,
      performedBy: req.user._id,
    });

    await transaction.populate("performedBy", "username firstName lastName role");

    res.status(201).json({
      message: "Pul muvaffaqiyatli qo'shildi",
      transaction,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual cash/card in (deposit money to kassa)
router.post("/in", async (req, res) => {
  try {
    const { amount, description, paymentMethod = "cash" } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Summa 0 dan katta bo'lishi kerak" });
    }

    if (!["cash", "card"].includes(paymentMethod)) {
      return res.status(400).json({ error: "paymentMethod: 'cash' yoki 'card' bo'lishi kerak" });
    }

    const transaction = await CashTransaction.create({
      type: "in",
      amount: Number(amount),
      paymentMethod,
      description: description ? description.trim() : `Manual kirim (${paymentMethod === "card" ? "Karta" : "Naqd"})`,
      performedBy: req.user._id,
    });

    await transaction.populate("performedBy", "username firstName lastName role");

    res.status(201).json({
      message: "Pul muvaffaqiyatli qo'shildi",
      transaction,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Withdraw cash (admin takes money)
router.post("/withdraw", async (req, res) => {
  try {
    const { amount, description, paymentMethod = "cash" } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Summa 0 dan katta bo'lishi kerak" });
    }

    if (!description || description.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "Izoh yozish majburiy" });
    }

    if (!["cash", "card"].includes(paymentMethod)) {
      return res.status(400).json({ error: "paymentMethod: 'cash' yoki 'card' bo'lishi kerak" });
    }

    // Kassa balansini tekshirish (metod bo'yicha)
    const totals = await CashTransaction.aggregate([
      { $match: { paymentMethod } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let totalInCents = 0;
    let totalOutCents = 0;
    for (const t of totals) {
      const amountCents = SaleService.toCents(t.total || 0);
      if (t._id === "in") totalInCents += amountCents;
      else totalOutCents += amountCents;
    }

    const currentBalanceCents = totalInCents - totalOutCents;
    const withdrawCents = SaleService.toCents(amount);

    if (withdrawCents > currentBalanceCents) {
      const currentBalance = SaleService.toDollar(currentBalanceCents);
      const methodName = paymentMethod === "card" ? "Bank (Karta)" : "Kassa (Naqd)";
      return res.status(400).json({
        error: `${methodName}da yetarli mablag' yo'q. Mavjud: ${currentBalance}$`,
      });
    }

    const transaction = await CashTransaction.create({
      type: "out",
      amount: Number(SaleService.toDollar(SaleService.toCents(amount))),
      paymentMethod,
      description: description.trim(),
      performedBy: req.user._id,
    });

    await transaction.populate(
      "performedBy",
      "username firstName lastName role",
    );

    res.status(201).json({
      message: "Pul muvaffaqiyatli olindi",
      transaction,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin hamyonidan xarajat (rashot / oylik)
router.post("/spend", async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { amount, type, description, sellerId, paymentMethod = "cash" } = req.body;
    const parsedAmount = Number(amount);

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Summa 0 dan katta bo'lishi kerak" });
    }

    if (!type || !["rashot", "oylik", "chiqim"].includes(type)) {
      return res.status(400).json({ error: "Tur 'rashot', 'oylik' yoki 'chiqim' bo'lishi kerak" });
    }

    if (!["cash", "card"].includes(paymentMethod)) {
      return res.status(400).json({ error: "paymentMethod: 'cash' yoki 'card' bo'lishi kerak" });
    }

    if (type === "oylik" && !sellerId) {
      return res.status(400).json({ error: "Oylik uchun sotuvchini tanlash majburiy" });
    }

    const amountCents = SaleService.toCents(parsedAmount);

    await session.withTransaction(async () => {
      // Tanlangan metod bo'yicha balansni tekshirish
      const balanceResult = await CashTransaction.aggregate([
        { $match: { paymentMethod } },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
          },
        },
      ]).session(session);

      let totalIn = 0;
      let totalOut = 0;
      balanceResult.forEach(r => {
        if (r._id === "in") totalIn += SaleService.toCents(r.total);
        else if (r._id === "out") totalOut += SaleService.toCents(r.total);
      });

      const currentBalanceCents = totalIn - totalOut;

      if (amountCents > currentBalanceCents) {
        const methodName = paymentMethod === "card" ? "Bank (Karta)" : "Kassa (Naqd)";
        throw new Error(`${methodName}da yetarli mablag' yo'q. Mavjud: ${SaleService.toDollar(currentBalanceCents)}$`);
      }

      const [transaction] = await CashTransaction.create([{
        type,
        amount: parsedAmount,
        paymentMethod,
        description: description ? description.trim() : "",
        performedBy: req.user._id,
        relatedSeller: type === "oylik" ? sellerId : null,
      }], { session });

      await transaction.populate("performedBy", "username firstName lastName role");
      await transaction.populate("relatedSeller", "firstName lastName username");

      res.status(201).json({
        message: type === "oylik" ? "Oylik muvaffaqiyatli berildi" : type === "chiqim" ? "Dokon xarajati qayd etildi" : "Xarajat qayd etildi",
        transaction,
      });
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

module.exports = router;
