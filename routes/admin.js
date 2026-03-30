const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const SellerStock = require("../models/SellerStock");
const SellerProduct = require("../models/SellerProduct");
const Transfer = require("../models/Transfer");
const { authenticate, isAdmin } = require("../middleware/auth");
const { validateSeller } = require("../middleware/validation");
const ReportDTO = require("../dto/ReportDTO");
const {
  createSellerProduct,
  transferStock,
  getAssignedStocks,
  getActiveAssignedStocksForSeller,
} = require("./utils");
const SaleService = require("../utils/saleService");

// Helper: validate MongoDB ObjectId format
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

router.use(authenticate);
router.use(isAdmin);

// Get all sellers
router.get("/sellers", async (req, res) => {
  try {
    const sellers = await User.find({ role: "seller" })
      .select("-__v")
      .sort({ createdAt: -1 });
    res.json({ sellers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get seller by id
router.get("/sellers/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid seller ID format" });
    }
    const seller = await User.findOne({ role: "seller", _id: req.params.id });
    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }
    res.json({ seller });
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
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid seller ID format" });
    }

    const { username, firstName, lastName, phoneNumber, avatarUrl, isActive } =
      req.body;

    // Check if phone number is already taken by another user
    if (phoneNumber) {
      const phoneOwner = await User.findOne({ phoneNumber, _id: { $ne: req.params.id } });
      if (phoneOwner) {
        return res.status(400).json({
          error: "Ushbu telefon raqamli foydalanuvchi allaqachon mavjud",
        });
      }
    }

    const seller = await User.findOneAndUpdate(
      { _id: req.params.id, role: "seller", isActive: true, isDeleted: { $ne: true } },
      { username, firstName, lastName, phoneNumber, avatarUrl, isActive },
      { new: true }
    ).select("-__v");

    if (!seller) {
      return res.status(404).json({ error: "Seller not found or cannot be updated" });
    }

    res.json({ seller });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete seller (Actually make as deleted) (Soft)
router.delete("/sellers/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid seller ID format" });
    }

    const seller = await User.findById(req.params.id);

    if (!seller || seller.role !== "seller") {
      return res.status(404).json({ error: "Seller not found" });
    }

    await seller.softDelete();

    res.json({ message: "Seller deleted successfully (soft)" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all seller stocks
router.get("/seller-stocks", async (req, res) => {
  try {
    const sellerStocks = await getAssignedStocks();
    res.json({ sellerStocks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all products for specific seller
router.get("/sellers/:sellerId/products", async (req, res) => {
  try {
    const { sellerId } = req.params;
    if (!isValidObjectId(sellerId)) {
      return res.status(400).json({ error: "Invalid seller ID format" });
    }

    const sellerProducts = await SellerProduct.find({
      seller: sellerId,
      isActive: true,
    }).populate("product");

    if (!sellerProducts || sellerProducts.length === 0) {
      return res.json({
        products: [],
        message: "No products found for this seller",
      });
    }

    const products = sellerProducts.map(
      (sellerProduct) => sellerProduct.product
    );

    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stocks for a specific seller
router.get("/sellers/:sellerId/stocks", async (req, res) => {
  try {
    const { sellerId } = req.params;
    if (!isValidObjectId(sellerId)) {
      return res.status(400).json({ error: "Invalid seller ID format" });
    }
    const seller = await User.findOne({ role: "seller", _id: sellerId });
    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }
    const sellerStocks = await getActiveAssignedStocksForSeller(seller._id);
    res.json({ sellerStocks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/sellers/:sellerId/sales", async (req, res) => {
  try {
    const { sellerId } = req.params;
    if (!isValidObjectId(sellerId)) {
      return res.status(400).json({ error: "Invalid seller ID format" });
    }
    const { start, end, date } = req.query;

    const query = { seller: new mongoose.Types.ObjectId(sellerId) };

    if (start && end) {
      query.timestamp = {
        $gte: new Date(`${start}T00:00:00.000Z`),
        $lte: new Date(`${end}T23:59:59.999Z`),
      };
    } else if (date) {
      // Use explicit UTC to avoid server timezone mismatch
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      if (isNaN(startOfDay) || isNaN(endOfDay)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      query.timestamp = { $gte: startOfDay, $lte: endOfDay };
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
          rawTotal: 0,
          discountPercent: sale.discountPercent || 0,
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
        const allReturned = group.items.every((i) => i.status === "returned");
        return { ...group, status: allReturned ? "returned" : group.status };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const stats = {
      totalOrders: groupedSales.length,
      totalAmount: SaleService.toDollar(
        groupedSales.reduce(
          (sum, g) => sum + SaleService.toCents(g.totalAmount),
          0,
        ),
      ),
      totalDebt: SaleService.toDollar(
        groupedSales.reduce(
          (sum, g) => sum + SaleService.toCents(g.debt),
          0,
        ),
      ),
      totalPaid: SaleService.toDollar(
        groupedSales.reduce(
          (sum, g) => sum + SaleService.toCents(g.paidAmount),
          0,
        ),
      ),
    };

    res.json({ sales: groupedSales, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stocks for a specific product
router.get("/products/:productId/stocks", async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ error: "Invalid product ID format" });
    }

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
  const session = await mongoose.startSession();
  try {
    const { stockId } = req.params;
    if (!isValidObjectId(stockId)) {
      return res.status(400).json({ error: "Invalid stock ID format" });
    }

    const { quantity } = req.body;

    if (typeof quantity !== "number" || quantity < 0) {
      return res.status(400).json({ error: "Valid quantity is required (must be >= 0)" });
    }

    await session.withTransaction(async () => {
      const sellerStock = await SellerStock.findById(stockId)
        .populate("seller")
        .populate("product")
        .session(session);

      if (!sellerStock) {
        throw new Error("Seller stock not found");
      }

      // Guard against null populated references (deleted seller/product)
      if (!sellerStock.seller) {
        throw new Error("Referenced seller no longer exists");
      }
      if (!sellerStock.product) {
        throw new Error("Referenced product no longer exists");
      }

      if (sellerStock.quantity === 0) {
        const sellerProduct = await SellerProduct.findBySellerAndProduct(
          sellerStock.seller._id,
          sellerStock.product._id
        ).session(session);

        if (!sellerProduct || !sellerProduct.isActive) {
          throw new Error("SellerProduct not active or not found");
        }
      }

      const oldQuantity = sellerStock.quantity;
      const difference = quantity - oldQuantity;
      const maxAllowed = oldQuantity + sellerStock.product.warehouseQuantity;

      if (maxAllowed < quantity) {
        throw new Error(
          `Cannot set quantity to ${quantity}. Max allowed is ${maxAllowed}`
        );
      }

      await transferStock({
        sellerId: sellerStock.seller._id,
        productId: sellerStock.product._id,
        amount: difference,
        session: session,
      });

      // 🔧 CRITICAL: Create Transfer record for audit trail
      if (difference !== 0) {
        await Transfer.create(
          [
            {
              seller: sellerStock.seller._id,
              product: sellerStock.product._id,
              quantity: Math.abs(difference),
              type: difference > 0 ? "transfer" : "return",
              status: "completed",
            },
          ],
          { session }
        );
      }
    });

    res.json({
      message: "Stock quantity updated successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

// assign or reassign product to seller
router.post(
  "/sellers/:sellerId/products/:productId/assign",
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.sellerId)) {
        return res.status(400).json({ error: "Invalid seller ID format" });
      }
      if (!isValidObjectId(req.params.productId)) {
        return res.status(400).json({ error: "Invalid product ID format" });
      }

      const seller = await User.findById(req.params.sellerId);
      const product = await Product.findById(req.params.productId);

      if (!seller || seller.role !== "seller") {
        return res.status(404).json({ error: "Seller not found" });
      }

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      await createSellerProduct(seller, product);

      res.json({ message: "Product assigned successfully", seller, product });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// unassign product from seller
router.delete(
  "/sellers/:sellerId/products/:productId/unassign",
  async (req, res) => {
    const session = await mongoose.startSession();
    try {
      const { sellerId, productId } = req.params;
      if (!isValidObjectId(sellerId)) {
        return res.status(400).json({ error: "Invalid seller ID format" });
      }
      if (!isValidObjectId(productId)) {
        return res.status(400).json({ error: "Invalid product ID format" });
      }
      const returnStock = req.query.returnStock === "true"; // ?returnStock=true

      await session.withTransaction(async () => {
        // Relationship check
        const sellerProduct = await SellerProduct.findBySellerAndProduct(
          sellerId,
          productId
        ).session(session);

        if (!sellerProduct || !sellerProduct.isActive) {
          throw new Error("SellerProduct not active or not found");
        }

        // 2. Stock lookup
        const existingSellerStock = await SellerStock.findBySellerAndProduct(
          sellerId,
          productId
        ).session(session);

        const quantity = existingSellerStock?.quantity || 0;

        if (quantity > 0) {
          if (!returnStock) {
            throw new Error(
              "Seller has remaining stock. Use returnStock=true to return it."
            );
          }

          await transferStock({
            sellerId: sellerId,
            productId: productId,
            amount: -quantity,
            session: session,
          });

          await Transfer.create(
            [
              {
                seller: sellerId,
                product: productId,
                quantity: quantity,
                type: "return",
                status: "completed",
              },
            ],
            { session }
          );
        }

        await sellerProduct.unassign(true, session);
      });

      res.json({
        success: true,
        message: returnStock
          ? "Product unassigned and stock returned"
          : "Product unassigned",
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    } finally {
      await session.endSession();
    }
  }
);

// Delete seller stock - Return all stock to warehouse and remove stock record
router.delete("/seller-stocks/:stockId", async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { stockId } = req.params;
    if (!isValidObjectId(stockId)) {
      return res.status(400).json({ error: "Invalid stock ID format" });
    }
    const { unassign } = req.query; // ?unassign=true to also unassign the product

    let returnedQuantity = 0;
    let sellerInfo = null;
    let productInfo = null;

    await session.withTransaction(async () => {
      // Find the seller stock with populated references
      const existingSellerStock = await SellerStock.findById(stockId)
        .populate("seller", "username firstName lastName")
        .populate("product", "name sku")
        .session(session);

      if (!existingSellerStock) {
        throw new Error("SellerStock not found");
      }

      // Guard against null populated references (deleted seller/product)
      if (!existingSellerStock.seller) {
        throw new Error("Referenced seller no longer exists");
      }
      if (!existingSellerStock.product) {
        throw new Error("Referenced product no longer exists");
      }

      returnedQuantity = existingSellerStock.quantity;
      sellerInfo = existingSellerStock.seller;
      productInfo = existingSellerStock.product;

      // Only process if there's stock to return
      if (returnedQuantity > 0) {
        // Transfer stock back to warehouse (negative amount = return)
        await transferStock({
          sellerId: sellerInfo._id,
          productId: productInfo._id,
          stockId: stockId,
          amount: -returnedQuantity,
          session: session,
        });

        // Create transfer record for audit trail
        await Transfer.create(
          [
            {
              seller: existingSellerStock.seller._id,
              product: existingSellerStock.product._id,
              quantity: returnedQuantity,
              type: "return",
              status: "completed",
            },
          ],
          { session }
        );
      }

      // Optionally unassign the product from seller
      if (unassign === "true") {
        const sellerProduct = await SellerProduct.findBySellerAndProduct(
          existingSellerStock.seller._id,
          existingSellerStock.product._id
        ).session(session);

        if (sellerProduct && sellerProduct.isActive) {
          await sellerProduct.unassign(true, session);
        }
      }
    });

    res.json({
      success: true,
      message:
        unassign === "true"
          ? "Stock returned to warehouse and product unassigned successfully"
          : "Stock returned to warehouse successfully",
      returnedQuantity: returnedQuantity,
      seller: {
        id: sellerInfo._id,
        name: `${sellerInfo.firstName} ${sellerInfo.lastName}`,
        username: sellerInfo.username,
      },
      product: {
        id: productInfo._id,
        name: productInfo.name,
        sku: productInfo.sku,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

// Get reports
router.get("/reports", async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        error: "start and end query params are required (YYYY-MM-DD)",
      });
    }

    // Parse dates
    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T23:59:59.999Z`);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({
        error: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const sales = await Sale.find({
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate("seller", "username firstName lastName")
      .populate("product", "name price costPrice")
      .sort({ timestamp: -1 });

    // Fetch all products
    const products = await Product.find({});

    // Fetch all seller stocks (with active assignments)
    const sellerStocks = await getAssignedStocks(true);

    const reportDTO = await ReportDTO.create(
      sales,
      products,
      sellerStocks,
      startDate,
      endDate
    );

    res.json(reportDTO.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
