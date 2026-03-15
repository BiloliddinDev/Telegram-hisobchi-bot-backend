const express = require("express");
const router = express.Router();
const Sale = require("../models/Sale");
const SellerStock = require("../models/SellerStock");
const SellerProduct = require("../models/SellerProduct");
const { authenticate, isSeller } = require("../middleware/auth");
const { getActiveAssignedStocksForSeller } = require("./utils");
const Customer = require("../models/Customer");
const SaleService = require("../utils/saleService");

router.use(authenticate);
router.use(isSeller);

// 1. Assigned products
router.get("/products", async (req, res) => {
  try {
    const products = await SellerProduct.find({
      sellerId: req.user._id,
      isActive: true,
    })
      .populate("product")
      .select("product assignAt");
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Seller stock inventory
router.get("/stocks", async (req, res) => {
  try {
    const assignedStocks = await getActiveAssignedStocksForSeller(req.user._id);

    const sorted = assignedStocks.sort((a, b) => {
      if (a.stock?.quantity === 0 && b.stock?.quantity > 0) return 1;
      if (a.stock?.quantity > 0 && b.stock?.quantity === 0) return -1;
      return 0;
    });

    const totalStockValue = sorted.reduce((total, row) => {
      return total + (row.stock?.quantity || 0) * (row.product?.costPrice || 0);
    }, 0);

    res.json({
      sellerStocks: sorted,
      summary: {
        totalProducts: sorted.length,
        totalQuantity: sorted.reduce((t, r) => t + (r.stock?.quantity || 0), 0),
        totalStockValue,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Specific product stock
router.get("/stocks/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const stock = await SellerStock.findBySellerAndProduct(
      req.user._id,
      productId,
    );

    if (!stock) {
      return res
        .status(404)
        .json({ error: "Stock not found for this product" });
    }

    await stock.populate("product", "name sku price costPrice image");
    res.json({ stock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Seller sales (guruhlangan)
router.get("/sales", async (req, res) => {
  try {
    const { start, end } = req.query;
    const query = { seller: req.user._id };

    if (start && end) {
      query.timestamp = {
        $gte: new Date(`${start}T00:00:00.000Z`),
        $lte: new Date(`${end}T23:59:59.999Z`),
      };
    }

    const sales = await Sale.find(query)
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
          timestamp: sale.timestamp,
          items: [],
          totalAmount: 0, // chegirma ayirilgan
          rawTotal: 0, // chegirmasiz ← yangi
          discountPercent: 0,
          debt: 0,
          paidAmount: 0,
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
        status: sale.status,
      });

      // Qaytarilgan itemlar summaga qo'shilmaydi
      if (sale.status !== "returned") {
        groupsMap[key].totalAmount = SaleService.toDollar(
          SaleService.toCents(groupsMap[key].totalAmount) +
            SaleService.toCents(sale.totalAmount),
        );
        groupsMap[key].debt = SaleService.toDollar(
          SaleService.toCents(groupsMap[key].debt) +
            SaleService.toCents(sale.debt || 0),
        );
        groupsMap[key].paidAmount = SaleService.toDollar(
          SaleService.toCents(groupsMap[key].paidAmount) +
            SaleService.toCents(sale.paidAmount || 0),
        );
        groupsMap[key].rawTotal = SaleService.toDollar(
          SaleService.toCents(groupsMap[key].rawTotal) +
            SaleService.toCents(sale.price * sale.quantity),
        );
      }

      groupsMap[key].discountPercent = sale.discountPercent || 0;
    }

    const groupedSales = Object.values(groupsMap)
      .map((group) => {
        // Barcha itemlar qaytarilgan bo'lsa → butun order "returned"
        const allReturned = group.items.every((i) => i.status === "returned");
        return { ...group, status: allReturned ? "returned" : group.status };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ sales: groupedSales });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Seller reports
router.get("/reports", async (req, res) => {
  try {
    const { year, month } = req.query;
    const startDate = new Date(
      year || new Date().getFullYear(),
      (month || new Date().getMonth()) - 1,
      1,
    );
    const endDate = new Date(
      year || new Date().getFullYear(),
      month || new Date().getMonth(),
      0,
      23,
      59,
      59,
    );

    const sales = await Sale.find({
      seller: req.user._id,
      timestamp: { $gte: startDate, $lte: endDate },
    })
      .populate("product", "name price")
      .sort({ timestamp: -1 });

    const totalRevenueCents = sales.reduce(
      (sum, sale) => sum + SaleService.toCents(sale.totalAmount),
      0,
    );
    const totalDebtCents = sales.reduce(
      (sum, sale) => sum + SaleService.toCents(sale.debt || 0),
      0,
    );
    const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);

    res.json({
      period: { startDate, endDate },
      summary: {
        totalSales: sales.length,
        totalRevenue: SaleService.toDollar(totalRevenueCents),
        totalDebt: SaleService.toDollar(totalDebtCents),
        totalQuantity,
      },
      sales,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Customers (qarzdorlar)
router.get("/customers", async (req, res) => {
  try {
    const customers = await Customer.find({
      seller: req.user._id,
      totalDebt: { $gt: 0 },
    }).sort({ totalDebt: -1 });

    const totalDebtCents = customers.reduce(
      (sum, c) => sum + SaleService.toCents(c.totalDebt),
      0,
    );

    res.json({
      customers,
      totalDebt: SaleService.toDollar(totalDebtCents),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
