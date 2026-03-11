const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const SellerStock = require("../models/SellerStock");
const Customer = require("../models/Customer");
const { authenticate, isSeller } = require("../middleware/auth");
const SaleService = require("../utils/saleService");

router.use(authenticate);
router.use(isSeller);

router.post("/batch", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      orderId,
      items,
      customerName,
      customerPhone,
      notes,
      paidAmount,
      discountPercent,
      discount,
      dueDate,
    } = req.body;

    // Validatsiya
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: "Kamida bitta mahsulot bo'lishi kerak" });
    }
    if (!orderId) {
      return res.status(400).json({ error: "OrderId majburiy" });
    }

    // 1. Service orqali hisob-kitob
    const { rawTotal, discountAmount, netTotal } = SaleService.calculateTotals({
      items,
      discountPercent,
    });

    const paid =
      paidAmount !== undefined && paidAmount !== null
        ? SaleService.toDollar(SaleService.toCents(paidAmount)) // normalize
        : netTotal;

    const { debt, status } = SaleService.calculateStatus({
      netTotal,
      paidAmount: paid,
    });

    const distributedItems = SaleService.distributePayment({
      items,
      discountPercent,
      paid,
      rawTotal,
    });

    // 2. Tranzaksiya
    await session.withTransaction(async () => {
      // Mijozni topish yoki yaratish
      let customerId = null;
      if (customerPhone) {
        let customer = await Customer.findOne({
          phone: customerPhone,
          seller: req.user._id,
        }).session(session);

        if (!customer) {
          [customer] = await Customer.create(
            [
              {
                seller: req.user._id,
                name: customerName || "Noma'lum",
                phone: customerPhone,
                totalDebt: 0,
              },
            ],
            { session },
          );
        }

        customerId = customer._id;

        // Mijoz qarzini yangilash
        if (debt > 0) {
          await Customer.findByIdAndUpdate(
            customerId,
            {
              $inc: { totalDebt: debt },
              $set: { lastPurchase: new Date() },
            },
            { session },
          );
        }
      }

      // Har bir item uchun
      for (const item of distributedItems) {
        const { productId, quantity, price, itemNet, itemPaid, itemDebt } =
          item;

        // Omborni tekshirish
        const sellerStock = await SellerStock.findOne({
          seller: req.user._id,
          product: productId,
        }).session(session);

        if (!sellerStock || sellerStock.quantity < quantity) {
          throw new Error(`Mahsulot yetarli emas: ${productId}`);
        }

        // Sale yaratish
        await Sale.create(
          [
            {
              seller: req.user._id,
              product: productId,
              quantity,
              price,
              customer: customerId || null,
              totalAmount: itemNet,
              paidAmount: itemPaid,
              debt: itemDebt,
              status,
              isDebt: itemDebt > 0,
              dueDate: dueDate || null,
              orderId,
              customerName: customerName || "",
              customerPhone: customerPhone || "",
              notes: notes || "",
              discount: Number((discountAmount / items.length).toFixed(2)),
              discountPercent: discountPercent || 0,
            },
          ],
          { session },
        );

        // Ombordan ayirish
        await SellerStock.updateOne(
          { _id: sellerStock._id },
          { $inc: { quantity: -quantity } },
          { session },
        );
      }
    });

    // Javob
    res.status(201).json({
      message: "Sotuv muvaffaqiyatli yakunlandi",
      orderId,
      rawTotal,
      netTotal,
      paidAmount: paid,
      debt,
      status,
    });
  } catch (error) {
    console.error("Batch sotuv xatosi:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

// --- 2. GET ALL SALES (Guruhlangan holda) ---
router.get("/", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { seller: req.user._id };

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    const sales = await Sale.find(query)
      .populate("seller", "username firstName lastName")
      .populate("product", "name price image")
      .sort({ timestamp: -1 });

    const groupsMap = {};
    for (const sale of sales) {
      const key = sale.orderId || sale._id.toString();

      if (!groupsMap[key]) {
        groupsMap[key] = {
          orderId: key,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          notes: sale.notes,
          seller: sale.seller,
          timestamp: sale.timestamp,
          items: [],
          debt: 0,
          paidAmount: 0,
          totalAmount: 0,
          discount: 0,
          discountPercent: 0,
        };
      }

      groupsMap[key].items.push({
        _id: sale._id,
        product: sale.product,
        quantity: sale.quantity,
        price: sale.price,
        totalAmount: sale.totalAmount,
      });

      groupsMap[key].debt = SaleService.toDollar(
        SaleService.toCents(groupsMap[key].debt) +
          SaleService.toCents(sale.debt || 0),
      );
      groupsMap[key].paidAmount = SaleService.toDollar(
        SaleService.toCents(groupsMap[key].paidAmount) +
          SaleService.toCents(sale.paidAmount),
      );
      groupsMap[key].totalAmount = SaleService.toDollar(
        SaleService.toCents(groupsMap[key].totalAmount) +
          SaleService.toCents(sale.totalAmount),
      );
      groupsMap[key].discount = SaleService.toDollar(
        SaleService.toCents(groupsMap[key].discount) +
          SaleService.toCents(sale.discount || 0),
      );
    }

    const groupedSales = Object.values(groupsMap).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );

    res.json({ sales: groupedSales });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
