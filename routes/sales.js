const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const SellerStock = require("../models/SellerStock");
const Customer = require("../models/Customer");
const { authenticate, isSeller } = require("../middleware/auth");
const SaleService = require("../utils/saleService");

const NONAME_RETURN_DAYS = 7;

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
        })
          .session(session)
          .populate("product", "costPrice");

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
              costPrice: sellerStock.product?.costPrice || 0,
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
        status: sale.status,
      });

      // Qaytarilgan itemlar summaga qo'shilmaydi
      if (sale.status !== "returned") {
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
    }

    const groupedSales = Object.values(groupsMap)
      .map((group) => {
        const allReturned = group.items.every((i) => i.status === "returned");
        return { ...group, status: allReturned ? "returned" : group.status };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ sales: groupedSales });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 3. RETURN (Qaytarish) ---
// POST /api/sales/return
//
// Body:
//   orderId     — majburiy
//   returnType  — "cash" | "debt"  (doimiy mijoz uchun, default: "cash")
//   items       — [{ saleId, quantity }]  (ixtiyoriy, bo'lmasa butun order qaytariladi)
//
// 1-tur (noname): customer yo'q → 7 kun limit, faqat naqd qaytarish
// 2-tur (doimiy): customer bor → muddatsiz, "cash" yoki "debt" tanlash mumkin

router.post("/return", async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { orderId, returnType = "cash", items } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "orderId majburiy" });
    }
    if (!["cash", "debt"].includes(returnType)) {
      return res.status(400).json({ error: "returnType: 'cash' yoki 'debt' bo'lishi kerak" });
    }

    // Buyurtmadagi barcha sale recordlarni topish
    const orderSales = await Sale.find({
      orderId,
      seller: req.user._id,
    }).populate("product", "name _id");

    if (!orderSales || orderSales.length === 0) {
      return res.status(404).json({ error: "Buyurtma topilmadi" });
    }

    // Hammasi allaqachon qaytarilganmi?
    const allReturned = orderSales.every((s) => s.status === "returned");
    if (allReturned) {
      return res.status(400).json({ error: "Bu buyurtma allaqachon qaytarilgan" });
    }

    const firstSale = orderSales[0];
    const isCustomer = !!firstSale.customer; // doimiy mijoz

    // ── 1-tur: Noname → 7 kun limit ──────────────────────────────────
    if (!isCustomer) {
      const diffDays =
        (Date.now() - new Date(firstSale.timestamp).getTime()) /
        (1000 * 60 * 60 * 24);

      if (diffDays > NONAME_RETURN_DAYS) {
        return res.status(400).json({
          error: `Qaytarish muddati o'tib ketdi. Bir martalik mijoz uchun ${NONAME_RETURN_DAYS} kun ichida qaytarish mumkin (${Math.floor(diffDays)} kun o'tdi)`,
        });
      }
    }

    // Qaytariladigan itemlarni aniqlash
    let salesToReturn;

    if (items && Array.isArray(items) && items.length > 0) {
      // Qisman qaytarish
      salesToReturn = [];
      for (const reqItem of items) {
        const sale = orderSales.find(
          (s) =>
            s._id.toString() === reqItem.saleId && s.status !== "returned"
        );
        if (!sale) continue;

        const returnQty = Math.min(Math.abs(reqItem.quantity), sale.quantity);
        if (returnQty > 0) salesToReturn.push({ sale, returnQty });
      }
    } else {
      // Butun orderni qaytarish
      salesToReturn = orderSales
        .filter((s) => s.status !== "returned")
        .map((s) => ({ sale: s, returnQty: s.quantity }));
    }

    if (salesToReturn.length === 0) {
      return res.status(400).json({ error: "Qaytariladigan mahsulot topilmadi" });
    }

    let totalCashBack = 0;   // naqd qaytariladigan summa
    let totalDebtCut = 0;    // qarzdan ayiriladigan summa

    await session.withTransaction(async () => {
      for (const { sale, returnQty } of salesToReturn) {
        const isFullReturn = returnQty === sale.quantity;
        const ratio = returnQty / sale.quantity;

        const returnedPaid = SaleService.toDollar(
          Math.round(SaleService.toCents(sale.paidAmount) * ratio)
        );
        const returnedDebt = SaleService.toDollar(
          Math.round(SaleService.toCents(sale.debt || 0) * ratio)
        );
        const returnedTotal = SaleService.toDollar(
          Math.round(SaleService.toCents(sale.totalAmount) * ratio)
        );

        // Zaxirani sotuvchiga qaytarish
        await SellerStock.increaseQuantity({
          sellerId: req.user._id,
          productId: sale.product._id,
          amount: returnQty,
          session,
        });

        // Sale ni yangilash
        if (isFullReturn) {
          await Sale.findByIdAndUpdate(
            sale._id,
            { status: "returned" },
            { session }
          );
        } else {
          // Qisman qaytarish: qolgan miqdorni saqlash
          await Sale.findByIdAndUpdate(
            sale._id,
            {
              quantity: sale.quantity - returnQty,
              totalAmount: SaleService.toDollar(
                SaleService.toCents(sale.totalAmount) - SaleService.toCents(returnedTotal)
              ),
              paidAmount: SaleService.toDollar(
                SaleService.toCents(sale.paidAmount) - SaleService.toCents(returnedPaid)
              ),
              debt: SaleService.toDollar(
                Math.max(0, SaleService.toCents(sale.debt || 0) - SaleService.toCents(returnedDebt))
              ),
            },
            { session }
          );
        }

        // Summalarni to'plash
        // "debt" returnType → faqat qarzni kamaytirish, naqd yo'q
        // "cash" returnType → naqd qaytarish + qarzni kamaytirish
        totalDebtCut = SaleService.toDollar(
          SaleService.toCents(totalDebtCut) + SaleService.toCents(returnedDebt)
        );
        if (returnType === "cash" || !isCustomer) {
          totalCashBack = SaleService.toDollar(
            SaleService.toCents(totalCashBack) + SaleService.toCents(returnedPaid)
          );
        }
      }

      // ── Doimiy mijoz: Customer.totalDebt ni yangilash ──────────────
      if (isCustomer) {
        const debtToReduce =
          returnType === "debt"
            ? totalDebtCut   // faqat qarz qismi
            : SaleService.toDollar(
                SaleService.toCents(totalDebtCut) + SaleService.toCents(totalCashBack)
              ); // qarz + to'langan qism (chunki butun purchase bekor)

        if (debtToReduce > 0) {
          const customer = await Customer.findById(firstSale.customer).session(session);
          if (customer) {
            const newDebt = SaleService.toDollar(
              Math.max(
                0,
                SaleService.toCents(customer.totalDebt) - SaleService.toCents(debtToReduce)
              )
            );
            await Customer.findByIdAndUpdate(
              customer._id,
              { totalDebt: newDebt },
              { session }
            );
          }
        }
      }
    });

    res.json({
      message: "Qaytarish muvaffaqiyatli amalga oshirildi",
      customerType: isCustomer ? "customer" : "noname",
      returnType: isCustomer ? returnType : "cash",
      cashBack: totalCashBack,
      debtReduced: totalDebtCut,
    });
  } catch (error) {
    console.error("Qaytarish xatosi:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

module.exports = router;
