const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const { authenticate, isAdmin } = require("../middleware/auth");
const { validateSeller } = require("../middleware/validation");

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// Get all sellers
router.get("/sellers", async (req, res) => {
  try {
    const sellers = await User.find({ role: "seller" })
      .populate("assignedProducts", "name price")
      .select("-__v")
      .sort({ createdAt: -1 });

    res.json({ sellers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new seller
router.post("/sellers", validateSeller, async (req, res) => {
  try {
    const { telegramId, username, firstName, lastName, phoneNumber } = req.body;

    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ error: "Ushbu telefon raqamli foydalanuvchi allaqachon mavjud" });
    }

    const seller = await User.create({
      telegramId: telegramId || undefined,
      username,
      firstName,
      lastName,
      phoneNumber,
      role: "seller",
    });

    res.status(201).json({ seller });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update seller
router.put("/sellers/:id", async (req, res) => {
  try {
    const { username, firstName, lastName, phoneNumber, avatarUrl, isActive } = req.body;
    const seller = await User.findByIdAndUpdate(
      req.params.id,
      { username, firstName, lastName, phoneNumber, avatarUrl, isActive },
      { new: true }
    ).select("-__v");

    if (!seller || seller.role !== "seller") {
      return res.status(404).json({ error: "Seller not found" });
    }

    res.json({ seller });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete seller
router.delete("/sellers/:id", async (req, res) => {
  try {
    const seller = await User.findById(req.params.id);

    if (!seller || seller.role !== "seller") {
      return res.status(404).json({ error: "Seller not found" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Seller deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign productId to seller
router.post("/sellers/:sellerId/products/:productId", async (req, res) => {
  try {
    const { quantity } = req.body;
    const seller = await User.findById(req.params.sellerId);
    const product = await Product.findById(req.params.productId);

    if (!seller || seller.role !== "seller") {
      return res.status(404).json({ error: "Seller not found" });
    }

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const assignQuantity = parseInt(quantity) || 0;
    if (assignQuantity > product.count) {
      return res.status(400).json({ error: "Omborda yetarli mahsulot yo'q" });
    }

    // Add productId to seller's assigned products
    if (!seller.assignedProducts.includes(product._id)) {
      seller.assignedProducts.push(product._id);
      await seller.save();
    }

    // Add seller to productId's assigned sellers
    if (!product.assignedSellers.includes(seller._id)) {
      product.assignedSellers.push(seller._id);
    }
    
    // Reduce count if quantity provided
    if (assignQuantity > 0) {
      product.count -= assignQuantity;
      
      // Update seller's count for this productId
      const sellerStockIndex = product.sellerStocks.findIndex(
        (s) => s.sellerId.toString() === seller._id.toString()
      );
      
      if (sellerStockIndex > -1) {
        product.sellerStocks[sellerStockIndex].quantity += assignQuantity;
      } else {
        product.sellerStocks.push({
          sellerId: seller._id,
          quantity: assignQuantity
        });
      }
    }
    await product.save();

    res.json({ message: "Product assigned successfully", seller, product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unassign productId from seller
router.delete("/sellers/:sellerId/products/:productId", async (req, res) => {
  try {
    const seller = await User.findById(req.params.sellerId);
    const product = await Product.findById(req.params.productId);

    if (!seller || seller.role !== "seller") {
      return res.status(404).json({ error: "Seller not found" });
    }

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    seller.assignedProducts = seller.assignedProducts.filter(
      (id) => id.toString() !== product._id.toString()
    );
    await seller.save();

    product.assignedSellers = product.assignedSellers.filter(
      (id) => id.toString() !== seller._id.toString()
    );
    await product.save();

    res.json({ message: "Product unassigned successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get monthly reports
router.get("/reports/monthly", async (req, res) => {
  try {
    const { year, month } = req.query;
    const startDate = new Date(
      year || new Date().getFullYear(),
      (month || new Date().getMonth()) - 1,
      1
    );
    const endDate = new Date(
      year || new Date().getFullYear(),
      month || new Date().getMonth(),
      0,
      23,
      59,
      59
    );

    const sales = await Sale.find({
      timestamp: { $gte: startDate, $lte: endDate },
    })
      .populate("sellerId", "username firstName lastName")
      .populate("productId", "name price")
      .sort({ timestamp: -1 });

    // Calculate statistics
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);

    // Sales by sellerId
    const salesBySeller = {};
    sales.forEach((sale) => {
      const sellerId = sale.sellerId._id.toString();
      if (!salesBySeller[sellerId]) {
        salesBySeller[sellerId] = {
          sellerId: sale.sellerId,
          totalSales: 0,
          totalRevenue: 0,
          totalQuantity: 0,
        };
      }
      salesBySeller[sellerId].totalSales += 1;
      salesBySeller[sellerId].totalRevenue += sale.totalAmount;
      salesBySeller[sellerId].totalQuantity += sale.quantity;
    });

    // Sales by productId
    const salesByProduct = {};
    sales.forEach((sale) => {
      const productId = sale.productId._id.toString();
      if (!salesByProduct[productId]) {
        salesByProduct[productId] = {
          productId: sale.productId,
          totalSales: 0,
          totalRevenue: 0,
          totalQuantity: 0,
        };
      }
      salesByProduct[productId].totalSales += 1;
      salesByProduct[productId].totalRevenue += sale.totalAmount;
      salesByProduct[productId].totalQuantity += sale.quantity;
    });

    res.json({
      period: { startDate, endDate },
      summary: {
        totalSales,
        totalRevenue,
        totalQuantity,
      },
      salesBySeller: Object.values(salesBySeller),
      salesByProduct: Object.values(salesByProduct),
      sales,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

