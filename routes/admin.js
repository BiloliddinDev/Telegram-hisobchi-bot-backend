const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const User = require("../models/User");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const SellerStock = require("../models/SellerStock");
const Transfer = require("../models/Transfer");
const { authenticate, isAdmin } = require("../middleware/auth");
const { validateSeller } = require("../middleware/validation");
const MonthlyReportDTO = require("../dto/MonthlyReportDTO");
const { manageAssingmentSellerAndProduct } = require("./utils");

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
      return res.status(400).json({
        error: "Ushbu telefon raqamli foydalanuvchi allaqachon mavjud",
      });
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
    const { username, firstName, lastName, phoneNumber, avatarUrl, isActive } =
      req.body;
    const seller = await User.findByIdAndUpdate(
      req.params.id,
      { username, firstName, lastName, phoneNumber, avatarUrl, isActive },
      { new: true },
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

    await manageAssingmentSellerAndProduct(
      seller._id,
      product._id,
      (isSaveSeller = true),
      (isSaveProduct = false),
      (toAssign = true),
    );

    // Reduce count if quantity provided
    if (assignQuantity > 0) {
      product.count -= assignQuantity;

      // Update seller's stock using SellerStock model
      const existingStock = await SellerStock.findBySellerAndProduct(
        seller._id,
        product._id,
      );

      if (existingStock) {
        await existingStock.updateQuantity(assignQuantity);
      } else {
        await SellerStock.create({
          seller: seller._id,
          product: product._id,
          quantity: assignQuantity,
        });
      }
    }
    await product.save();

    res.json({ message: "Product assigned successfully", seller, product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product from seller's stock
router.delete("/sellers/:sellerId/products/:productId", async (req, res) => {
  try {
    const { sellerId, productId } = req.params;
    const { returnStock } = req.query; // ?returnStock=true

    const seller = await User.findById(sellerId);
    const product = await Product.findById(productId);

    if (!seller || seller.role !== "seller") {
      return res.status(404).json({ error: "Seller not found" });
    }

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check seller's current stock
    const sellerStock = await SellerStock.findBySellerAndProduct(
      sellerId,
      productId,
    );
    const currentStock = sellerStock ? sellerStock.quantity : 0;

    // If seller has stock, handle it
    if (currentStock > 0) {
      if (returnStock === "true") {
        // Return stock to warehouse
        product.count += currentStock;
        await product.save();

        // Update seller stock to 0
        await sellerStock.updateQuantity(-currentStock);

        // Create return transfer record
        await Transfer.create({
          sellerId: sellerId,
          productId: productId,
          quantity: currentStock,
          type: "return",
          status: "completed",
        });

        // Continue with unassignment...
      } else {
        // Refuse to unassign with stock
        return res.status(400).json({
          error: `Cannot unassign. Seller has ${currentStock} units in stock. Return stock first or use ?returnStock=true`,
          currentStock: currentStock,
          suggestion: `Use: DELETE /admin/sellers/${sellerId}/products/${productId}?returnStock=true`,
        });
      }
    }
    // Remove assignments
    await manageAssingmentSellerAndProduct(
      sellerId,
      productId,
      (isSaveSeller = true),
      (isSaveProduct = true),
      (toAssign = false),
    );

    res.json({
      message: "Product unassigned successfully",
      stockReturned:
        currentStock > 0 && returnStock === "true" ? currentStock : 0,
    });
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
      timestamp: { $gte: startDate, $lte: endDate },
    })
      .populate("sellerId", "username firstName lastName")
      .populate("productId", "name price")
      .sort({ timestamp: -1 });

    // Use DTO to format response
    const reportDTO = MonthlyReportDTO.create(sales, startDate, endDate);

    res.json(reportDTO.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

<<<<<<< HEAD
// Export to Excel
router.get("/export-excel", async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    const sales = await Sale.find()
      .populate("productId")
      .populate("sellerId")
      .sort({ timestamp: -1 });

    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Ombor qoldig'i
    const sheet1 = workbook.addWorksheet("Ombor qoldig'i");
    sheet1.columns = [
      { header: "Nomi", key: "name", width: 30 },
      { header: "Kategoriya", key: "category", width: 20 },
      { header: "Narxi", key: "price", width: 15 },
      { header: "Soni", key: "count", width: 15 },
      { header: "Jami qiymati (Tannarx bo'yicha)", key: "totalValue", width: 25 },
    ];

    let totalWarehouseValue = 0;

    products.forEach((product) => {
      // Calculate total quantity (warehouse + sellers)
      const sellerStocksTotal = product.sellerStocks 
        ? product.sellerStocks.reduce((sum, s) => sum + (s.quantity || 0), 0) 
        : 0;
      const totalQuantity = (product.count || 0) + sellerStocksTotal;
      
      const itemValue = totalQuantity * (product.costPrice || 0);
      totalWarehouseValue += itemValue;

      sheet1.addRow({
        name: product.name,
        category: product.category,
        price: product.price,
        count: totalQuantity,
        totalValue: itemValue,
      });
    });

    // Add total row at the end
    sheet1.addRow({});
    sheet1.addRow({
      name: "UMUMIY OMBOUR QOLDIG'I SUMMASI:",
      totalValue: totalWarehouseValue,
    });

    // Style the total row
    const totalRow = sheet1.lastRow;
    totalRow.getCell("name").font = { bold: true };
    totalRow.getCell("totalValue").font = { bold: true };

    // Sheet 2: Sotuvlar tarixi
    const sheet2 = workbook.addWorksheet("Sotuvlar tarixi");
    sheet2.columns = [
      { header: "Sana", key: "date", width: 20 },
      { header: "Mahsulot nomi", key: "productName", width: 30 },
      { header: "Miqdori", key: "quantity", width: 15 },
      { header: "Umumiy summa", key: "totalAmount", width: 20 },
      { header: "Sotuvchi ismi", key: "sellerName", width: 25 },
    ];

    sales.forEach((sale) => {
      sheet2.addRow({
        date: sale.timestamp ? new Date(sale.timestamp).toLocaleString("uz-UZ") : "",
        productName: sale.productId ? sale.productId.name : "O'chirilgan mahsulot",
        quantity: sale.quantity,
        totalAmount: sale.totalAmount,
        sellerName: sale.sellerId ? `${sale.sellerId.firstName} ${sale.sellerId.lastName || ""}` : "Noma'lum",
      });
    });

    // Headers for response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "Hisobot_" + new Date().toISOString().split('T')[0] + ".xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel export error:", error);
=======
// Get all seller stocks
router.get("/seller-stocks", async (req, res) => {
  try {
    const sellerStocks = await SellerStock.find()
      .populate("seller", "username firstName lastName telegramId")
      .populate("product", "name sku price costPrice")
      .sort({ updatedAt: -1 });

    res.json({ sellerStocks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stocks for a specific seller
router.get("/sellers/:sellerId/stocks", async (req, res) => {
  try {
    const { sellerId } = req.params;

    const sellerStocks = await SellerStock.findBySeller(sellerId);

    if (!sellerStocks || sellerStocks.length === 0) {
      return res.json({
        sellerStocks: [],
        message: "No stocks found for this seller",
      });
    }

    res.json({ sellerStocks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stocks for a specific product
router.get("/products/:productId/stocks", async (req, res) => {
  try {
    const { productId } = req.params;

    const productStocks = await SellerStock.findByProduct(productId);

    if (!productStocks || productStocks.length === 0) {
      return res.json({
        productStocks: [],
        message: "No stocks found for this product",
      });
    }

    res.json({ productStocks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update seller stock quantity directly
router.patch("/seller-stocks/:stockId", async (req, res) => {
  try {
    const { stockId } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== "number" || quantity < 0) {
      return res
        .status(400)
        .json({ error: "Valid quantity is required (must be >= 0)" });
    }

    const sellerStock = await SellerStock.findById(stockId)
      .populate("seller", "username firstName lastName")
      .populate("product", "name sku");

    if (!sellerStock) {
      return res.status(404).json({ error: "Seller stock not found" });
    }

    const oldQuantity = sellerStock.quantity;
    const difference = quantity - oldQuantity;
    const isIncrease = difference > 0;

    const product = await Product.findById(sellerStock.product._id);

    if (isIncrease) {
      // Increasing seller stock - need to take from warehouse
      if (product.count < difference) {
        return res.status(400).json({
          error: `Cannot increase stock by ${difference}. Warehouse only has ${product.count} units available.`,
          warehouseStock: product.count,
          requestedIncrease: difference,
        });
      }
      product.count -= difference; // Take from warehouse
    } else if (difference < 0) {
      // Decreasing seller stock - return to warehouse
      product.count += Math.abs(difference); // Add to warehouse
    }

    await product.save();

    // 🔧 CRITICAL: Create Transfer record for audit trail
    if (difference !== 0) {
      await Transfer.create({
        sellerId: sellerStock.seller._id,
        productId: sellerStock.product._id,
        quantity: Math.abs(difference),
        type: isIncrease ? "transfer" : "return",
        status: "completed",
      });
    }

    // Update seller stock
    await sellerStock.updateQuantity(quantity);

    res.json({
      message: "Stock quantity updated successfully",
      sellerStock,
      change: difference,
      warehouseStockAfter: product.count,
      transferCreated: difference !== 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete seller stock (remove seller from product)
router.delete("/seller-stocks/:stockId", async (req, res) => {
  try {
    const { stockId } = req.params;

    const sellerStock = await SellerStock.findById(stockId)
      .populate("seller", "username firstName lastName")
      .populate("product", "name sku");

    if (!sellerStock) {
      return res.status(404).json({ error: "Seller stock not found" });
    }

    const returnedQuantity = sellerStock.quantity;

    // Return quantity to warehouse
    const product = await Product.findById(sellerStock.product._id);
    if (product && returnedQuantity > 0) {
      product.count += returnedQuantity;
      await product.save();

      // 🆕 CREATE TRANSFER RECORD for audit trail
      await Transfer.create({
        sellerId: sellerStock.seller._id,
        productId: sellerStock.product._id,
        quantity: returnedQuantity,
        type: "return",
        status: "completed",
      });
    }

    // Remove seller from assigned sellers (only if no other products)
    const otherStocksOfSameProduct = await SellerStock.find({
      seller: sellerStock.seller._id,
      product: sellerStock.product._id,
      _id: { $ne: stockId }, // Exclude current stock
    });

    if (otherStocksOfSameProduct.length === 0) {
      await manageAssingmentSellerAndProduct(
        sellerStock.seller._id,
        sellerStock.product._id,
        (isSaveSeller = true),
        (isSaveProduct = true),
        (toAssign = false),
      );
    }

    await sellerStock.updateQuantity(0);

    res.json({
      message: "Seller stock removed successfully",
      returnedToWarehouse: returnedQuantity,
      transferCreated: returnedQuantity > 0,
      sellerStock,
    });
  } catch (error) {
>>>>>>> 9785d5ddff1b5e641b720e924859c2d70bbeb89e
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
