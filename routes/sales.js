const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const SellerStock = require("../models/SellerStock");
const Customer = require("../models/Customer");
const { authenticate, isSeller } = require("../middleware/auth");

router.use(authenticate);
router.use(isSeller);

// --- 1. BATCH SALE (POST) ---
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

    if (!items?.length) return res.status(400).json({ error: "Mahsulot yo'q" });

    const rawTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // ✅ TO'G'RILANDI: Nullish coalescing (??) 0 summani ham to'g'ri o'qiydi
    const totalAmount = req.body.totalAmount ?? rawTotal - (discount || 0);
    const paid = Number(paidAmount ?? totalAmount);
    const totalDebtAmount = Math.max(0, totalAmount - paid);
    const status =
      totalDebtAmount > 0 ? (paid === 0 ? "debt" : "partial") : "paid";

    await session.withTransaction(async () => {
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

        if (totalDebtAmount > 0) {
          await Customer.findByIdAndUpdate(
            customerId,
            { $inc: { totalDebt: totalDebtAmount }, lastPurchase: new Date() },
            { session },
          );
        }
      }

      let remainingPaid = paid;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isLastItem = i === items.length - 1;

        const sellerStock = await SellerStock.findOne({
          seller: req.user._id,
          product: item.productId,
        }).session(session);

        if (!sellerStock || sellerStock.quantity < item.quantity) {
          throw new Error(`${item.productId} uchun yetarli qoldiq yo'q`);
        }

        const itemRawTotal = item.price * item.quantity;
        const itemRatio = rawTotal > 0 ? itemRawTotal / rawTotal : 0;
        const itemPaid = isLastItem
          ? remainingPaid
          : Math.floor(paid * itemRatio);
        remainingPaid -= itemPaid;

        // ✅ TO'G'RILANDI: discountPercent bo'lmasa 0 olinadi (NaN oldini olish)
        const safeDiscountPercent = discountPercent || 0;
        const itemTotalAfterDiscount =
          itemRawTotal - itemRawTotal * (safeDiscountPercent / 100);

        await Sale.create(
          [
            {
              seller: req.user._id,
              product: item.productId,
              quantity: item.quantity,
              price: item.price,
              customer: customerId,
              totalAmount: itemTotalAfterDiscount,
              paidAmount: itemPaid,
              debt: Math.max(0, itemTotalAfterDiscount - itemPaid),
              status,
              orderId,
              customerName,
              customerPhone,
              notes: notes || "",
              discount: (discount || 0) / items.length,
              discountPercent: safeDiscountPercent,
              dueDate,
            },
          ],
          { session },
        );

        await SellerStock.updateOne(
          { _id: sellerStock._id },
          { $inc: { quantity: -item.quantity } },
          { session },
        );
      }
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Sotuv yakunlandi",
        orderId,
        totalDebtAmount,
      });
  } catch (error) {
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

      groupsMap[key].debt += sale.debt;
      groupsMap[key].paidAmount += sale.paidAmount;
      groupsMap[key].totalAmount += sale.totalAmount;
      groupsMap[key].discount += sale.discount || 0;
      groupsMap[key].discountPercent = sale.discountPercent || 0;
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
