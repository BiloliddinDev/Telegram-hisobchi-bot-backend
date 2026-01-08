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
const { get } = require("./products");

// All admin routes require authentication and admin role
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

// Get all sellers
router.get("/sellers/:id", async (req, res) => {
  try {
    const seller = await User.findById({ role: "seller", _id: req.params.id });
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

// Delete seller (Actually make as deleted)
router.delete("/sellers/:id", async (req, res) => {
  try {
    const seller = await User.findById(req.params.id);

    if (!seller || seller.role !== "seller") {
      return res.status(404).json({ error: "Seller not found" });
    }

    await seller.delete();

    res.json({ message: "Seller inactivated successfully" });
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
      (sellerProduct) => sellerProduct.product,
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
    const seller = await User.findById(sellerId);
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

    const sales = await Sale.findBySeller(sellerId);

    if (!sales || sales.length === 0) {
      return res.json({
        sales: [],
        message: "No sales found for this seller",
      });
    }

    res.json({ sales });
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
  const session = await mongoose.startSession();
  try {
    const { stockId } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== "number" || quantity < 0) {
      throw new Error("Valid quantity is required (must be >= 0)");
    }

    await session.withTransaction(async () => {
      const sellerStock = await SellerStock.findById(stockId)
        .populate("seller")
        .populate("product")
        .session(session);

      if (!sellerStock) {
        throw new Error("Seller stock not found");
      }

      if (sellerStock.quantity === 0) {
        const sellerProduct = await SellerProduct.findBySellerAndProduct(
          sellerStock.seller._id,
          sellerStock.product._id,
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
          `Cannot set quantity to ${quantity}. Max allowed is ${maxAllowed}`,
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
          { session },
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
  },
);

// unassign product from seller
router.delete(
  "/sellers/:sellerId/products/:productId/unassign",
  async (req, res) => {
    const session = await mongoose.startSession();
    try {
      const { sellerId, productId } = req.params;
      const returnStock = req.query.returnStock === "true"; // ?returnStock=true

      await session.withTransaction(async () => {
        // Relationship check
        const sellerProduct = await SellerProduct.findBySellerAndProduct(
          sellerId,
          productId,
        ).session(session);

        if (!sellerProduct || !sellerProduct.isActive) {
          throw new Error("SellerProduct not active or not found");
        }

        // 2. Stock lookup
        const existingSellerStock = await SellerStock.findBySellerAndProduct(
          sellerId,
          productId,
        ).session(session);

        const quantity = existingSellerStock?.quantity || 0;

        if (quantity > 0) {
          if (!returnStock) {
            throw new Error(
              "Seller has remaining stock. Use returnStock=true to return it.",
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
            { session },
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
  },
);

// Delete seller stock - Return all stock to warehouse and remove stock record
router.delete("/seller-stocks/:stockId", async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { stockId } = req.params;
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
          { session },
        );
      }

      // Optionally unassign the product from seller
      if (unassign === "true") {
        const sellerProduct = await SellerProduct.findBySellerAndProduct(
          existingSellerStock.seller._id,
          existingSellerStock.product._id,
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
      .populate("product", "name price")
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
      endDate,
    );

    res.json(reportDTO.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
