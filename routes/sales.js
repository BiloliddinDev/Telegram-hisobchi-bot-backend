const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const SellerStock = require("../models/SellerStock");
const Customer = require("../models/Customer");
const CashTransaction = require("../models/CashTransaction");
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
      paymentMethod = "cash",
      cashPaid = 0,
      cardPaid = 0,
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
    const zeroCostWarnings = [];
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

        // Mijoz qarzini yangilash (safe: compute exact value to prevent float drift)
        if (debt > 0) {
          const currentDebtCents = SaleService.toCents(customer.totalDebt);
          const newDebt = SaleService.toDollar(
            currentDebtCents + SaleService.toCents(debt),
          );
          await Customer.findByIdAndUpdate(
            customerId,
            {
              $set: { totalDebt: newDebt, lastPurchase: new Date() },
            },
            { session },
          );
        }
      }

      // Har bir item uchun
      const totalPaidCents = SaleService.toCents(paid);
      let remainingCashCents = SaleService.toCents(cashPaid);
      let remainingCardCents = SaleService.toCents(cardPaid);

      for (let i = 0; i < distributedItems.length; i++) {
        const item = distributedItems[i];
        const isLastItem = i === distributedItems.length - 1;
        const { productId, quantity, price, itemNet, itemPaid, itemDebt } =
          item;

        // Omborni tekshirish
        const sellerStock = await SellerStock.findOne({
          seller: req.user._id,
          product: productId,
        })
          .session(session)
          .populate("product", "name costPrice");

        if (!sellerStock) {
          throw new Error(`Mahsulot omborda topilmadi`);
        }

        if (sellerStock.quantity < quantity) {
          const productName = sellerStock.product?.name || productId;
          throw new Error(
            `"${productName}" yetarli emas. Omborda: ${sellerStock.quantity} dona, siz: ${quantity} dona`,
          );
        }

        // costPrice=0 bo'lsa warning yig'amiz
        const productCostPrice = sellerStock.product?.costPrice || 0;
        if (!productCostPrice) {
          zeroCostWarnings.push(sellerStock.product?.name || productId);
        }

        // Pro-rate cash and card payments for mixed method
        let itemCashPaid = 0;
        let itemCardPaid = 0;
        const itemPaidCents = SaleService.toCents(itemPaid);

        if (paymentMethod === "mixed" && totalPaidCents > 0) {
          if (isLastItem) {
            itemCashPaid = SaleService.toDollar(remainingCashCents);
            itemCardPaid = SaleService.toDollar(remainingCardCents);
          } else {
            const itemCashCents = Math.round((itemPaidCents * SaleService.toCents(cashPaid)) / totalPaidCents);
            const itemCardCents = itemPaidCents - itemCashCents;
            
            // Limit by remaining to avoid over-distribution due to rounding
            const actualCashCents = Math.min(itemCashCents, remainingCashCents);
            const actualCardCents = Math.min(itemCardCents, remainingCardCents);
            
            itemCashPaid = SaleService.toDollar(actualCashCents);
            itemCardPaid = SaleService.toDollar(itemPaidCents - actualCashCents);
            
            remainingCashCents -= actualCashCents;
            remainingCardCents -= (itemPaidCents - actualCashCents);
          }
        } else if (paymentMethod === "card") {
          itemCardPaid = itemPaid;
        } else {
          itemCashPaid = itemPaid;
        }

        // Sale yaratish
        await Sale.create(
          [
            {
              seller: req.user._id,
              product: productId,
              quantity,
              price,
              costPrice: productCostPrice,
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
              discount: SaleService.toDollar(
                SaleService.toCents(item.itemRaw) - SaleService.toCents(item.itemNet)
              ),
              discountPercent: discountPercent || 0,
              paymentMethod,
              cashPaid: itemCashPaid,
              cardPaid: itemCardPaid,
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

      // Kassaga tushum yozish
      if (paymentMethod === "mixed") {
        const cashCents = SaleService.toCents(cashPaid);
        const cardCents = SaleService.toCents(cardPaid);

        if (cashCents > 0) {
          await CashTransaction.create(
            [
              {
                type: "in",
                amount: SaleService.toDollar(cashCents),
                paymentMethod: "cash",
                description: `Sotuv (Naqd): ${orderId}`,
                performedBy: req.user._id,
              },
            ],
            { session },
          );
        }
        if (cardCents > 0) {
          await CashTransaction.create(
            [
              {
                type: "in",
                amount: SaleService.toDollar(cardCents),
                paymentMethod: "card",
                description: `Sotuv (Karta): ${orderId}`,
                performedBy: req.user._id,
              },
            ],
            { session },
          );
        }
      } else {
        const paidCents = SaleService.toCents(paid);
        if (paidCents > 0) {
          await CashTransaction.create(
            [
              {
                type: "in",
                amount: SaleService.toDollar(paidCents),
                paymentMethod: paymentMethod === "card" ? "card" : "cash",
                description: `Sotuv (${paymentMethod === "card" ? "Karta" : "Naqd"}): ${orderId}`,
                performedBy: req.user._id,
              },
            ],
            { session },
          );
        }
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
      ...(zeroCostWarnings.length > 0 && {
        warnings: zeroCostWarnings.map(
          (name) => `"${name}" mahsulotida tan narx (costPrice) kiritilmagan — foyda hisobi noto'g'ri bo'lishi mumkin`,
        ),
      }),
    });
  } catch (error) {
    console.error("Batch sotuv xatosi:", error);
    const status = error.message.includes("yetarli") || error.message.includes("topilmadi") ? 400 : 500;
    res.status(status).json({ error: error.message });
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
      // Use explicit UTC to avoid server timezone mismatch
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      query.timestamp = { $gte: start, $lte: end };
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
          rawTotal: 0,
          discount: 0,
          discountPercent: 0,
          dueDate: sale.dueDate,
          paymentMethod: sale.paymentMethod || "cash",
          cashPaid: 0,
          cardPaid: 0,
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
        groupsMap[key].cashPaid = SaleService.toDollar(
          SaleService.toCents(groupsMap[key].cashPaid || 0) +
          SaleService.toCents(sale.cashPaid || 0),
        );
        groupsMap[key].cardPaid = SaleService.toDollar(
          SaleService.toCents(groupsMap[key].cardPaid || 0) +
          SaleService.toCents(sale.cardPaid || 0),
        );
        groupsMap[key].rawTotal = SaleService.toDollar(
          SaleService.toCents(groupsMap[key].rawTotal) +
            SaleService.toCents(sale.price * sale.quantity),
        );
        groupsMap[key].discount = SaleService.toDollar(
          SaleService.toCents(groupsMap[key].discount) +
            SaleService.toCents(sale.discount || 0),
        );
        // Aralash to'lov bo'lsa, qismlarni jamlash
        if (sale.paymentMethod === "mixed") {
          groupsMap[key].paymentMethod = "mixed";
        } else if (groupsMap[key].paymentMethod !== sale.paymentMethod) {
          groupsMap[key].paymentMethod = "mixed";
        }
        // discountPercent faol itemdan olinadi
        groupsMap[key].discountPercent = sale.discountPercent || 0;
      }
    }

    const groupedSales = Object.values(groupsMap)
      .map((group) => ({
        ...group,
        status: SaleService.computeOrderStatus({
          items: group.items,
          debt: group.debt,
          paidAmount: group.paidAmount,
        }),
      }))
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

    let totalCashBack = 0;   // naqd qaytariladigan summa
    let totalDebtCut = 0;    // qarzdan ayiriladigan summa
    let isCustomer = false;
    let customerType = "noname";

    await session.withTransaction(async () => {
      // Fetch order sales INSIDE transaction to prevent double-return race condition
      const orderSales = await Sale.find({
        orderId,
        seller: req.user._id,
      })
        .populate("product", "name _id")
        .session(session);

      if (!orderSales || orderSales.length === 0) {
        throw new Error("Buyurtma topilmadi");
      }

      // Hammasi allaqachon qaytarilganmi?
      const allReturned = orderSales.every((s) => s.status === "returned");
      if (allReturned) {
        throw new Error("Bu buyurtma allaqachon qaytarilgan");
      }

      const firstSale = orderSales[0];
      isCustomer = !!firstSale.customer;
      customerType = isCustomer ? "customer" : "noname";

      // ── 1-tur: Noname → 7 kun limit ──────────────────────────────────
      if (!isCustomer) {
        const diffDays =
          (Date.now() - new Date(firstSale.timestamp).getTime()) /
          (1000 * 60 * 60 * 24);

        if (diffDays > NONAME_RETURN_DAYS) {
          throw new Error(
            `Qaytarish muddati o'tib ketdi. Bir martalik mijoz uchun ${NONAME_RETURN_DAYS} kun ichida qaytarish mumkin (${Math.floor(diffDays)} kun o'tdi)`,
          );
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
        throw new Error("Qaytariladigan mahsulot topilmadi");
      }



      for (const { sale, returnQty } of salesToReturn) {
        const isFullReturn = returnQty === sale.quantity;
        const ratio = returnQty / sale.quantity;

        // Total va paid mustaqil yaxlitlanadi; debt esa total - paid orqali
        // hisoblanadi — shunda invariant (total = paid + debt) buzilmaydi.
        const returnedTotalCents = Math.round(SaleService.toCents(sale.totalAmount) * ratio);
        const returnedPaidCents = Math.min(
          returnedTotalCents,
          Math.round(SaleService.toCents(sale.paidAmount) * ratio)
        );
        const returnedDebtCents = Math.max(0, returnedTotalCents - returnedPaidCents);

        // Aralash to'lov qismlarini ham proportsional hisoblaymiz
        const returnedCashPaidCents = Math.round(SaleService.toCents(sale.cashPaid || 0) * ratio);
        const returnedCardPaidCents = Math.min(
          returnedPaidCents - returnedCashPaidCents, 
          Math.round(SaleService.toCents(sale.cardPaid || 0) * ratio)
        );
        // CardPaid ni qoldiq sifatida aniqroq hisoblash (sent farqi chiqmasligi uchun)
        const finalReturnedCardPaidCents = Math.max(0, returnedPaidCents - returnedCashPaidCents);

        const returnedTotal = SaleService.toDollar(returnedTotalCents);
        const returnedPaid = SaleService.toDollar(returnedPaidCents);
        const returnedDebt = SaleService.toDollar(returnedDebtCents);

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
            { 
              status: "returned",
              cashPaid: 0,
              cardPaid: 0,
              paidAmount: 0,
              debt: 0,
              isDebt: false
            },
            { session }
          );
        } else {
          // Qisman qaytarish: recordni ikkiga bo'lamiz (sotilgan qismi va qaytarilgan qismi)
          
          // 1. Yangi "returned" record yaratish
          const returnedSaleData = sale.toObject();
          delete returnedSaleData._id;
          delete returnedSaleData.createdAt;
          delete returnedSaleData.updatedAt;
          
          returnedSaleData.quantity = returnQty;
          returnedSaleData.totalAmount = returnedTotal;
          returnedSaleData.paidAmount = returnedPaid;
          returnedSaleData.debt = returnedDebt;
          returnedSaleData.cashPaid = SaleService.toDollar(returnedCashPaidCents);
          returnedSaleData.cardPaid = SaleService.toDollar(finalReturnedCardPaidCents);
          returnedSaleData.status = "returned";
          returnedSaleData.isDebt = false;
          returnedSaleData.discount = SaleService.toDollar(
            Math.round(SaleService.toCents(sale.discount || 0) * ratio)
          );

          await Sale.create([returnedSaleData], { session });

          // 2. Asl recordni yangilash (miqdorni kamaytirish va summalarni qayta hisoblash)
          const newTotalAmount = SaleService.toDollar(
            SaleService.toCents(sale.totalAmount) - SaleService.toCents(returnedTotal)
          );
          const newPaidAmount = SaleService.toDollar(
            SaleService.toCents(sale.paidAmount) - SaleService.toCents(returnedPaid)
          );
          const newCashPaid = SaleService.toDollar(
            SaleService.toCents(sale.cashPaid || 0) - returnedCashPaidCents
          );
          const newCardPaid = SaleService.toDollar(
            SaleService.toCents(sale.cardPaid || 0) - finalReturnedCardPaidCents
          );

          const { debt: newDebt, status: newStatus } = SaleService.calculateStatus({
            netTotal: newTotalAmount,
            paidAmount: newPaidAmount,
          });

          await Sale.findByIdAndUpdate(
            sale._id,
            {
              quantity: sale.quantity - returnQty,
              totalAmount: newTotalAmount,
              paidAmount: newPaidAmount,
              cashPaid: newCashPaid,
              cardPaid: newCardPaid,
              debt: newDebt,
              status: newStatus,
              isDebt: newDebt > 0,
              discount: SaleService.toDollar(
                SaleService.toCents(sale.discount || 0) - Math.round(SaleService.toCents(sale.discount || 0) * ratio)
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

      // Kassadan naqd qaytarish yozish
      const cashBackCents = SaleService.toCents(totalCashBack);
      if (cashBackCents > 0) {
        await CashTransaction.create(
          [
            {
              type: "out",
              amount: Number(totalCashBack),
              description: `Qaytarish: ${orderId}`,
              performedBy: req.user._id,
            },
          ],
          { session },
        );
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
      customerType,
      returnType: isCustomer ? returnType : "cash",
      cashBack: totalCashBack,
      debtReduced: totalDebtCut,
    });
  } catch (error) {
    console.error("Qaytarish xatosi:", error);
    const status = error.message.includes("topilmadi") || error.message.includes("allaqachon") || error.message.includes("muddati") ? 400 : 500;
    res.status(status).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

module.exports = router;
