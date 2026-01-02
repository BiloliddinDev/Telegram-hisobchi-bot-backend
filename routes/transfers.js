const express = require("express");
const router = express.Router();
const Transfer = require("../models/Transfer");
const Product = require("../models/Product");
const User = require("../models/User");
const { authenticate, isAdmin } = require("../middleware/auth");

router.use(authenticate);
router.use(isAdmin);

// Get transfer history
router.get("/", async (req, res) => {
  try {
    const transfers = await Transfer.find()
      .populate("seller", "username firstName lastName")
      .populate("product", "name sku")
      .sort({ createdAt: -1 });
    res.json({ transfers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new transfer(s)
router.post("/", async (req, res) => {
  try {
    const { sellerId, items } = req.body; // items: [{ productId, quantity }]

    const seller = await User.findById(sellerId);
    if (!seller || seller.role !== "seller") {
      return res.status(404).json({ error: "Sotuvchi topilmadi" });
    }

    const createdTransfers = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Mahsulot topilmadi: ${item.productId}`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Omborda yetarli mahsulot yo'q: ${product.name}`);
      }

      // Update product stock
      product.stock -= item.quantity;

      // Update seller stock for this product
      const sellerStockIndex = product.sellerStocks.findIndex(
        (s) => s.seller.toString() === sellerId
      );

      if (sellerStockIndex > -1) {
        product.sellerStocks[sellerStockIndex].quantity += item.quantity;
      } else {
        product.sellerStocks.push({
          seller: sellerId,
          quantity: item.quantity,
        });
      }

      // Add product to seller's assigned products if not already there
      if (!seller.assignedProducts.includes(product._id)) {
        seller.assignedProducts.push(product._id);
      }

      await product.save();

      // Create transfer record
      const transfer = await Transfer.create({
        seller: sellerId,
        product: product._id,
        quantity: item.quantity,
        type: "transfer",
      });
      createdTransfers.push(transfer);
    }

    await seller.save();

    res.status(201).json({ message: "Muvaffaqiyatli biriktirildi", transfers: createdTransfers });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update transfer (Edit)
router.put("/:id", async (req, res) => {
  try {
    const { quantity } = req.body;
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ error: "Transfer topilmadi" });
    }

    if (transfer.status === "cancelled") {
      return res.status(400).json({ error: "Bekor qilingan transferni tahrirlab bo'lmaydi" });
    }

    const product = await Product.findById(transfer.product);
    const diff = quantity - transfer.quantity;

    if (diff > 0) {
      // Oshirilyapti, omborda borligini tekshirish
      if (product.stock < diff) {
        return res.status(400).json({ error: "Omborda yetarli mahsulot yo'q" });
      }
      product.stock -= diff;
    } else {
      // Kamaytiryapti, omborga qaytadi
      product.stock += Math.abs(diff);
    }

    // Sotuvchi stokini yangilash
    const sellerStockIndex = product.sellerStocks.findIndex(
      (s) => s.seller.toString() === transfer.seller.toString()
    );

    if (sellerStockIndex > -1) {
      product.sellerStocks[sellerStockIndex].quantity += diff;
      if (product.sellerStocks[sellerStockIndex].quantity < 0) {
         return res.status(400).json({ error: "Sotuvchida buncha mahsulot yo'q (allaqachon sotilgan bo'lishi mumkin)" });
      }
    }

    await product.save();
    transfer.quantity = quantity;
    await transfer.save();

    res.json({ message: "Transfer yangilandi", transfer });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Return transfer
router.post("/:id/return", async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ error: "Transfer topilmadi" });
    }

    if (transfer.type === "return" || transfer.status === "cancelled") {
      return res.status(400).json({ error: "Ushbu transferni qaytarib bo'lmaydi" });
    }

    const product = await Product.findById(transfer.product);
    const sellerStockIndex = product.sellerStocks.findIndex(
      (s) => s.seller.toString() === transfer.seller.toString()
    );

    if (sellerStockIndex === -1 || product.sellerStocks[sellerStockIndex].quantity < transfer.quantity) {
       return res.status(400).json({ error: "Sotuvchida yetarli mahsulot yo'q (ba'zilari sotilgan bo'lishi mumkin)" });
    }

    // Omborga qaytarish
    product.stock += transfer.quantity;
    product.sellerStocks[sellerStockIndex].quantity -= transfer.quantity;

    await product.save();

    // Yangi qaytarish recordini yaratish yoki statusini o'zgartirish
    // Foydalanuvchi "Qaytarilganlar (Return) - To'q sariq" dedi, demak bu status emas, record turi bo'lishi kerak
    await Transfer.create({
      seller: transfer.seller,
      product: transfer.product,
      quantity: transfer.quantity,
      type: "return",
    });

    // Asl transferni bekor qilish (ixtiyoriy, lekin mantiqan qaytarilgan deb belgilash yaxshi)
    transfer.status = "cancelled";
    await transfer.save();

    res.json({ message: "Mahsulot omborga qaytarildi" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
