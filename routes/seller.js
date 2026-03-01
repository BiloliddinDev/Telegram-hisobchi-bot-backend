const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const SellerStock = require("../models/SellerStock");
const SellerProduct = require("../models/SellerProduct");
const { authenticate, isSeller } = require("../middleware/auth");
const { getActiveAssignedStocksForSeller } = require("./utils");

router.use(authenticate);
router.use(isSeller);

// Get sellerId's assigned products
router.get("/products", async (req, res) => {
  try {
    const products = await SellerProduct.find({
      sellerId: req.user._id,
      isActive: true,
    })
      .populate("product")
      .select("product assignAt");
    res.json({ products: products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get seller's stock inventory (ACTIVE ASSIGNMENTS ONLY)
router.get("/stocks", async (req, res) => {
  try {
    const assignedStocks = await getActiveAssignedStocksForSeller(req.user._id);

    // Calculate total stock value
    const totalStockValue = assignedStocks.reduce((total, row) => {
      return total + (row.stock?.quantity || 0) * (row.product?.costPrice || 0);
    }, 0);

    const totalProducts = assignedStocks.length;
    const totalQuantity = assignedStocks.reduce(
      (total, row) => total + (row.stock?.quantity || 0),
      0,
    );

    res.json({
      sellerStocks: assignedStocks,
      summary: {
        totalProducts,
        totalQuantity,
        totalStockValue,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stock for a specific product
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

// Get sellerId's sales
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
          totalAmount: 0,
          discount: 0,
          discountPercent: 0,
          debt: 0,
          paidAmount: 0,
        };
      }

      groupsMap[key].items.push({
        _id: sale._id,
        product: sale.product,
        quantity: sale.quantity,
        price: sale.price,
        totalAmount: sale.totalAmount,
      });

      groupsMap[key].totalAmount += sale.totalAmount;
      groupsMap[key].debt += sale.debt || 0;
      groupsMap[key].paidAmount += sale.paidAmount || 0;
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

// Get sellerId's reports
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

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);

    res.json({
      period: { startDate, endDate },
      summary: {
        totalSales,
        totalRevenue,
        totalQuantity,
      },
      sales,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
