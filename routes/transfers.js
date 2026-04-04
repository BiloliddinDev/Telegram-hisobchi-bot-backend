const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Transfer = require("../models/Transfer");
const Product = require("../models/Product");
const User = require("../models/User");
const SellerProduct = require("../models/SellerProduct");
const { authenticate, isAdmin } = require("../middleware/auth");
const { transferStock } = require("./utils");
const multer = require("multer");
const ExcelJS = require("exceljs");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Get transfer history
router.get("/", authenticate, isAdmin, async (req, res) => {
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

/**
 * @swagger
 * /api/transfers/template:
 *   get:
 *     summary: Download an Excel template for bulk product linking
 *     tags: [Transfers]
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Excel template file (Uzbek)
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get("/template", async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Mahsulotlarni Biriktirish");

    // Define columns
    worksheet.columns = [
      { header: "Mahsulot SKU (Majburiy)", key: "sku", width: 30 },
      { header: "Miqdor (Majburiy)", key: "quantity", width: 20 },
    ];

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0070C0" }, // Blue for linking
    };

    // Add example rows (Uzbek)
    worksheet.addRows([
      { sku: "IP15PM-256", quantity: 5 },
      { sku: "APP2", quantity: 10 },
      { sku: "MBA-M2-S", quantity: 1 },
    ]);

    // Style example rows
    for (let i = 2; i <= 4; i++) {
      worksheet.getRow(i).font = { color: { argb: "FF666666" }, italic: true };
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="mahsulot_biriktirish_template.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Template error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/transfers/import:
 *   post:
 *     summary: Bulk link products to a seller via Excel
 *     tags: [Transfers]
 *     security:
 *       - TelegramAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file (.xlsx) with SKU and Quantity
 *               sellerIdentifier:
 *                 type: string
 *                 description: Phone number or Username of the receiving seller
 *     responses:
 *       200:
 *         description: Import results summary
 */
router.post(
  "/import",
  authenticate,
  isAdmin,
  upload.single("file"),
  async (req, res) => {
    const session = await mongoose.startSession();
    try {
      const { sellerIdentifier } = req.body;
      if (!req.file) {
        return res.status(400).json({ error: "XLSX fayl yuklanmadi" });
      }
      if (!sellerIdentifier) {
        return res.status(400).json({ error: "Sotuvchi (phone/username) ko'rsatilishi kerak" });
      }

      // Fix: Support both ObjectId and Phone/Username lookup
      const query = mongoose.Types.ObjectId.isValid(sellerIdentifier)
        ? { _id: sellerIdentifier }
        : { $or: [{ username: sellerIdentifier }, { phoneNumber: sellerIdentifier }] };

      const seller = await User.findOne({
        ...query,
        role: "seller",
        isDeleted: false
      });

      if (!seller) {
        return res.status(404).json({ error: `Sotuvchi topilmadi: ${sellerIdentifier}` });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        return res.status(400).json({ error: "Excel fayli bo'sh" });
      }

      const rows = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        rows.push(row.values);
      });

      if (rows.length === 0) {
        return res.status(400).json({ error: "Faylda ma'lumot yo'q" });
      }

      const success = [];
      const errors = [];
      const BATCH_SIZE = 50;

      // Processing in batches for performance
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batchRows = rows.slice(i, i + BATCH_SIZE);

        await session.withTransaction(async () => {
          for (let j = 0; j < batchRows.length; j++) {
            const rowData = batchRows[j];
            const rowNum = i + j + 2;

            const sku = rowData[1] ? String(rowData[1]).trim() : "";
            const quantity = Number(rowData[2]);

            if (!sku || isNaN(quantity) || quantity <= 0) {
              errors.push({ row: rowNum, message: "Noto'g'ri SKU yoki musbat Miqdor" });
              continue;
            }

            // Find product by SKU
            const product = await Product.findOne({ sku: sku, isActive: true }).session(session);
            if (!product) {
              errors.push({ row: rowNum, message: `Mahsulot SKU bo'yicha topilmadi: ${sku}` });
              continue;
            }

            // Check warehouse stock
            if (product.warehouseQuantity < quantity) {
              errors.push({
                row: rowNum,
                message: `Omborda yetarli emas: ${product.name}. Mavjud: ${product.warehouseQuantity}, So'ralgan: ${quantity}`
              });
              continue;
            }

            // Relationship management
            let sellerProduct = await SellerProduct.findBySellerAndProduct(seller._id, product._id).session(session);
            if (!sellerProduct) {
              [sellerProduct] = await SellerProduct.create([{
                seller: seller._id,
                product: product._id,
                isActive: true,
                assignAt: new Date(),
                unassignAt: null
              }], { session });
            } else if (!sellerProduct.isActive) {
              await sellerProduct.assign(true, session);
            }

            // Execute Transfer
            await transferStock({
              sellerId: seller._id,
              productId: product._id,
              amount: quantity,
              session: session
            });

            // Log Transfer
            await Transfer.create([{
              seller: seller._id,
              product: product._id,
              quantity: quantity,
              type: "transfer",
              status: "completed"
            }], { session });

            success.push(sku);
          }
        });
      }

      res.json({
        success: true,
        message: "Ommaviy biriktirish yakunlandi",
        successCount: success.length,
        failedCount: errors.length,
        details: {
          seller: {
            username: seller.username,
            phone: seller.phoneNumber
          },
          errors
        }
      });
    } catch (error) {
      console.error("Bulk transfer error:", error);
      res.status(500).json({ error: error.message });
    } finally {
      await session.endSession();
    }
  });


// Create new transfer(s)
router.post("/", authenticate, isAdmin, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { sellerId, items } = req.body; // items: [{ productId, quantity }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array is required" });
    }

    if (!sellerId || !isValidObjectId(sellerId)) {
      return res.status(400).json({ error: "Sotuvchi ID noto'g'ri" });
    }

    for (const item of items) {
      if (!isValidObjectId(item.productId)) {
        return res
          .status(400)
          .json({ error: `Notog'ri productId: ${item.productId}` });
      }
    }

    // Validate seller exists
    const seller = await User.findById(sellerId);
    if (!seller || seller.role !== "seller") {
      return res.status(404).json({ error: "Sotuvchi topilmadi" });
    }

    let createdTransfers = [];

    await session.withTransaction(async () => {
      // Clear array in case of transaction retries
      createdTransfers = [];

      // Extract product IDs
      const productIds = items.map((item) => item.productId);

      // Get products
      const products = await Product.find({
        _id: { $in: productIds },
      }).session(session);

      // Turn to map
      const productMap = new Map(products.map((p) => [p._id.toString(), p]));

      // Process each item in the transfer
      for (const item of items) {
        const { productId, quantity } = item;

        if (!quantity || quantity <= 0) {
          throw new Error(`Invalid quantity for product ${productId}`);
        }

        // Get product from map
        const product = productMap.get(productId.toString());

        if (!product) {
          throw new Error(`Mahsulot topilmadi: ${productId}`);
        }

        // Check warehouse stock availability
        if (product.warehouseQuantity < quantity) {
          throw new Error(
            `Omborda yetarli mahsulot yo'q: ${product.name}. Mavjud: ${product.warehouseQuantity}, So'ralgan: ${quantity}`,
          );
        }

        // Check if seller-product relationship exists
        let sellerProduct = await SellerProduct.findBySellerAndProduct(
          seller._id,
          product._id,
        ).session(session);

        // If relationship doesn't exist or is inactive, create/activate it
        if (!sellerProduct) {
          sellerProduct = (
            await SellerProduct.create(
              [
                {
                  seller: seller._id,
                  product: product._id,
                  isActive: true,
                  assignAt: new Date(),
                  unassignAt: null,
                },
              ],
              { session },
            )
          )[0];
        } else if (!sellerProduct.isActive) {
          // Reactivate if it was previously unassigned
          await sellerProduct.assign(true, session);
        }

        // Transfer stock from warehouse to seller using utility function
        await transferStock({
          sellerId: seller._id,
          productId: product._id,
          amount: quantity,
          session: session,
        });

        // Create transfer record
        const transfer = (
          await Transfer.create(
            [
              {
                seller: seller._id,
                product: product._id,
                quantity: quantity,
                type: "transfer",
                status: "completed",
              },
            ],
            { session },
          )
        )[0];
        createdTransfers.push(transfer);
      }
    });

    // Populate transfer details for response
    const populatedTransfers = await Transfer.find({
      _id: { $in: createdTransfers.map((t) => t._id) },
    })
      .populate("seller", "username firstName lastName")
      .populate("product", "name sku");

    res.status(201).json({
      message: "Successfully created transfers",
      transfers: populatedTransfers,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

module.exports = router;
