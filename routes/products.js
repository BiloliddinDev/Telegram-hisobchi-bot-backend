const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const ExcelJS = require("exceljs");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { authenticate, isAdmin } = require("../middleware/auth");
const { validateProduct } = require("../middleware/validation");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const Sale = require("../models/Sale");
const SellerStock = require("../models/SellerStock");
const SellerProduct = require("../models/SellerProduct");
const Transfer = require("../models/Transfer");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Helper: escape regex special characters to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * @swagger
 * /api/products/import/template:
 *   get:
 *     summary: Download an empty Excel template for bulk product import
 *     tags: [Products]
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Excel template file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get("/import/template", async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Products");

    // Define columns
    worksheet.columns = [
      { header: "Name (Required)", key: "name", width: 30 },
      { header: "Price (Optional if auto-adjusting)", key: "price", width: 30 },
      { header: "CostPrice (Required for auto-adjusting)", key: "costPrice", width: 35 },
      { header: "Category (Required)", key: "category", width: 25 },
      { header: "WarehouseQuantity", key: "warehouseQuantity", width: 18 },
      { header: "SKU", key: "sku", width: 15 },
      { header: "Color", key: "color", width: 15 },
      { header: "Description", key: "description", width: 35 },
      { header: "Image URL", key: "image", width: 30 },
    ];

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };

    // Add example rows to guide the user
    worksheet.addRows([
      {
        name: "Misol: iPhone 15 Pro Max 256GB",
        price: 1200,
        costPrice: 1000,
        category: "Smartphones",
        warehouseQuantity: 50,
        sku: "IP15PM-256",
        color: "Qora",
        description: "Asosiy parametrlar to'ldirilgan ideal misol",
        image: "https://example.com/ip15.png",
      },
      {
        name: "Misol: AirPods Pro 2",
        price: 250,
        costPrice: 200,
        category: "Naushniklar",
        warehouseQuantity: 100,
        sku: "APP2",
        color: "Oq",
      },
      {
        name: "Misol: Oddiy Telefon Stenkasi",
        price: 15,
        category: "Aksessuarlar",
        // Qolgan maydonlar bo'sh (ixtiyoriy ekanligini ko'rsatish)
        description: "Faqat majburiy maydonlar to'ldirilgan",
      },
      {
        name: "Misol: MacBook Air M2",
        price: 1100,
        costPrice: 950,
        category: "Noutbuklar",
        warehouseQuantity: 0, // Nol miqdor namunasi
        sku: "MBA-M2-S",
        color: "Kumush",
      },
      {
        name: "Misol: USB-C Kabel 1 metr",
        price: 20,
        costPrice: 5,
        category: "Kabellar",
        warehouseQuantity: 500,
        sku: "CBL-1M",
        color: "Oq",
      },
      {
        name: "Misol: Auto-Price Case (No Price)",
        costPrice: 100,
        category: "Gadgets",
        description: "Price ustuni bo'sh bo'lsa, sozlamalar bo'yicha hisoblanadi",
      },
    ]);

    // Style example rows slightly differently to stand out (optional grey text)
    for (let i = 2; i <= 6; i++) {
      worksheet.getRow(i).font = { color: { argb: "FF666666" }, italic: true };
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="products_import_template.xlsx"'
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
 * /api/products/import:
 *   post:
 *     summary: Bulk import products via Excel
 *     tags: [Products]
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
 *                 description: Excel file (.xlsx) up to 1000 rows
 *               priceAdjustmentMode:
 *                 type: string
 *                 enum: [FIXED, PERCENTAGE]
 *                 description: Mode for auto-calculating empty Price cells
 *               priceAdjustmentValue:
 *                 type: number
 *                 description: Value to add or percentage to apply to CostPrice
 *     responses:
 *       200:
 *         description: Import result with success/skip counts
 */
router.post(
  "/import",
  authenticate,
  isAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "XLSX fayl yuklanmadi" });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        return res
          .status(400)
          .json({ error: "Excel fayli bo'sh yoki o'qib bo'lmadi" });
      }

      const rows = [];
      worksheet.eachRow((row, rowNumber) => {
        // Skip header
        if (rowNumber === 1) return;
        rows.push(row.values);
      });

      if (rows.length === 0) {
        return res.status(400).json({ error: "Faylda ma'lumot yo'q" });
      }

      if (rows.length > 1000) {
        return res.status(400).json({
          error: "Bitta faylda 1000 tadan ortiq mahsulot bo'lishi mumkin emas",
        });
      }

      const { priceAdjustmentMode, priceAdjustmentValue } = req.body;
      const adjustmentValue = Number(priceAdjustmentValue);

      const imported = [];
      const skipped = [];
      const errors = [];
      const uniqueCategories = new Set();
      const parsedData = [];

      for (let i = 0; i < rows.length; i++) {
        const rowData = rows[i];
        const rowNum = i + 2;

        const name = rowData[1] ? String(rowData[1]).trim() : "";
        let price = rowData[2] !== undefined ? Number(rowData[2]) : NaN;
        const costPrice = Number(rowData[3]);
        const categoryName = rowData[4] ? String(rowData[4]).trim() : "";
        const warehouseQuantity = Number(rowData[5]) || 0;
        const sku = rowData[6] ? String(rowData[6]).trim() : "";
        const color = rowData[7] ? String(rowData[7]).trim() : "";
        const description = rowData[8] ? String(rowData[8]).trim() : "";
        const image = rowData[9] ? String(rowData[9]).trim() : "";

        // Auto-calculate Price if missing
        if (isNaN(price) && !isNaN(costPrice) && priceAdjustmentMode && !isNaN(adjustmentValue)) {
          if (priceAdjustmentMode === "FIXED") {
            price = costPrice + adjustmentValue;
          } else if (priceAdjustmentMode === "PERCENTAGE") {
            price = costPrice + (costPrice * adjustmentValue) / 100;
          }
          price = Math.round(price * 100) / 100; // Round to 2 decimals
        }

        if (!name || isNaN(price) || !categoryName) {
          errors.push({
            row: rowNum,
            message:
              "Majburiy maydonlar (Name, Price yoki CostPrice+Settings, Category) to'liq emas yoki noto'g'ri turda",
          });
          continue;
        }

        uniqueCategories.add(categoryName);
        parsedData.push({
          rowNum,
          name,
          price,
          costPrice,
          categoryName,
          warehouseQuantity,
          sku,
          color,
          description,
          image,
        });
      }

      // Process Categories (Find existing, create missing)
      const categoryMap = new Map();
      const existingCats = await Category.find({
        name: { $in: Array.from(uniqueCategories) },
      });
      existingCats.forEach((c) =>
        categoryMap.set(c.name.toLowerCase(), c._id)
      );

      const newCatsToCreate = [];
      for (const catName of uniqueCategories) {
        if (!categoryMap.has(catName.toLowerCase())) {
          newCatsToCreate.push({ name: catName });
        }
      }

      if (newCatsToCreate.length > 0) {
        // Continue on dups error in insertMany
        try {
          const insertedCats = await Category.insertMany(newCatsToCreate, {
            ordered: false,
          });
          insertedCats.forEach((c) =>
            categoryMap.set(c.name.toLowerCase(), c._id)
          );
        } catch (catErr) {
          // If some insert failed due to duplicate keys (race condition), just re-fetch them
          const newExisting = await Category.find({
            name: { $in: newCatsToCreate.map((n) => n.name) },
          });
          newExisting.forEach((c) =>
            categoryMap.set(c.name.toLowerCase(), c._id)
          );
        }
      }

      // Process Products - Find dups by Name or SKU
      const allNames = parsedData.map((d) => d.name);
      const allSkus = parsedData.map((d) => d.sku).filter(Boolean);

      let orConditions = [];
      if (allNames.length > 0) orConditions.push({ name: { $in: allNames } });
      if (allSkus.length > 0) orConditions.push({ sku: { $in: allSkus } });

      let existingProducts = [];
      if (orConditions.length > 0) {
        existingProducts = await Product.find({ $or: orConditions }).select(
          "name sku"
        );
      }

      const existingNamesSet = new Set(
        existingProducts.map((p) => p.name.toLowerCase())
      );
      const existingSkusSet = new Set(
        existingProducts.filter((p) => p.sku).map((p) => p.sku.toLowerCase())
      );

      // Chunk into 50 and Save
      let bulkOps = [];
      const BATCH_SIZE = 50;

      for (const item of parsedData) {
        const nameLower = item.name.toLowerCase();
        const skuLower = item.sku ? item.sku.toLowerCase() : null;

        if (
          existingNamesSet.has(nameLower) ||
          (skuLower && existingSkusSet.has(skuLower))
        ) {
          skipped.push({
            row: item.rowNum,
            name: item.name,
            reason: "Ushbu mahsulot nomi yoki SKU si bazada mavjud (Dublikat)",
          });
          continue;
        }

        const catId = categoryMap.get(item.categoryName.toLowerCase());
        if (!catId) {
          errors.push({
            row: item.rowNum,
            message: "Kategoriya topilmadi va yaratib ham bo'lmadi",
          });
          continue;
        }

        bulkOps.push({
          insertOne: {
            document: {
              name: item.name,
              price: item.price,
              costPrice: item.costPrice,
              category: catId,
              warehouseQuantity: item.warehouseQuantity,
              sku: item.sku,
              color: item.color,
              description: item.description,
              image: item.image,
              isActive: true,
            },
          },
        });

        // Use Set to prevent local duplicates across the uploaded file
        existingNamesSet.add(nameLower);
        if (skuLower) existingSkusSet.add(skuLower);

        if (bulkOps.length === BATCH_SIZE) {
          try {
            await Product.bulkWrite(bulkOps, { ordered: false });
            imported.push(...bulkOps.map((op) => op.insertOne.document.name));
          } catch (writeErr) {
            console.error("Bulk write error: ", writeErr);
          }
          bulkOps = [];
        }
      }

      if (bulkOps.length > 0) {
        try {
          await Product.bulkWrite(bulkOps, { ordered: false });
          imported.push(...bulkOps.map((op) => op.insertOne.document.name));
        } catch (writeErr) {
          console.error("Bulk write error: ", writeErr);
        }
      }

      res.json({
        success: true,
        message: "Import yakunlandi",
        importedCount: imported.length,
        skippedCount: skipped.length,
        errorsCount: errors.length,
        details: {
          skipped,
          errors,
        },
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/products/warehouse/template:
 *   get:
 *     summary: Download an Excel template for bulk warehouse quantity update
 *     tags: [Products]
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Excel template file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get("/warehouse/template", async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("WarehouseUpdate");

    // Define columns
    worksheet.columns = [
      { header: "SKU (Required)", key: "sku", width: 25 },
      { header: "Quantity (Required)", key: "quantity", width: 15 },
      { header: "Status (Required: INC, DEC, SET)", key: "status", width: 30 },
    ];

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFC00000" }, // Reddish for warehouse update
    };

    // Add example rows
    worksheet.addRows([
      {
        sku: "IP15PM-256",
        quantity: 10,
        status: "INC",
        _comment: "Quantity ni 10 ga oshiradi",
      },
      {
        sku: "APP2",
        quantity: 5,
        status: "DEC",
        _comment: "Quantity ni 5 taga kamaytiradi (min 0)",
      },
      {
        sku: "MBA-M2-S",
        quantity: 100,
        status: "SET",
        _comment: "Quantity ni tuman 100 ga o'zgartiradi",
      },
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
      'attachment; filename="warehouse_update_template.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Warehouse template error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/products/warehouse/update:
 *   post:
 *     summary: Bulk update warehouse quantities via Excel
 *     tags: [Products]
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
 *                 description: Excel file (.xlsx) with SKU, Quantity, and Status
 *     responses:
 *       200:
 *         description: Update result summary
 */
router.post(
  "/warehouse/update",
  authenticate,
  isAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "XLSX fayl yuklanmadi" });
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

      const updated = [];
      const errors = [];
      const skus = rows
        .map((r) => (r[1] ? String(r[1]).trim() : ""))
        .filter(Boolean);

      // Fetch existing products to verify SKUs
      const existingProducts = await Product.find({
        sku: { $in: skus },
      }).select("sku");
      const existingSkus = new Set(
        existingProducts.map((p) => p.sku.toLowerCase())
      );

      let bulkOps = [];
      const BATCH_SIZE = 50;

      for (let i = 0; i < rows.length; i++) {
        const rowData = rows[i];
        const rowNum = i + 2;

        const sku = rowData[1] ? String(rowData[1]).trim() : "";
        const quantity = Number(rowData[2]);
        const status = rowData[3] ? String(rowData[3]).trim().toUpperCase() : "";

        if (!sku || isNaN(quantity) || quantity < 0 || !["INC", "DEC", "SET"].includes(status)) {
          errors.push({
            row: rowNum,
            message: "Noto'g'ri ma'lumot (SKU, musbat Quantity, yoki Status: INC/DEC/SET)",
          });
          continue;
        }

        if (!existingSkus.has(sku.toLowerCase())) {
          errors.push({
            row: rowNum,
            message: `SKU bazada topilmadi: ${sku}`,
          });
          continue;
        }

        let update;
        if (status === "SET") {
          update = { $set: { warehouseQuantity: quantity } };
        } else if (status === "INC") {
          update = { $inc: { warehouseQuantity: quantity } };
        } else if (status === "DEC") {
          // Pipeline update for atomic capping at 0
          update = [
            {
              $set: {
                warehouseQuantity: {
                  $max: [0, { $subtract: ["$warehouseQuantity", quantity] }]
                }
              }
            }
          ];
        }

        bulkOps.push({
          updateOne: {
            filter: { sku: sku },
            update: update,
          },
        });

        if (bulkOps.length === BATCH_SIZE) {
          await Product.bulkWrite(bulkOps);
          bulkOps = [];
        }
        updated.push(sku);
      }

      if (bulkOps.length > 0) {
        await Product.bulkWrite(bulkOps);
      }

      res.json({
        success: true,
        message: "Ombor miqdorini yangilash yakunlandi",
        updatedCount: updated.length,
        errorsCount: errors.length,
        details: {
          errors,
        },
      });
    } catch (error) {
      console.error("Warehouse update error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get all products (admin only)
router.get("/", authenticate, isAdmin, async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (category) {
      if (!isValidObjectId(category)) {
        return res.status(400).json({ error: "Invalid category ID format" });
      }
      filter.category = category;
    }
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { sku: { $regex: escaped, $options: "i" } },
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: ["category"],
      sort: { createdAt: -1 },
    };
    const products = await Product.paginate(filter, options);
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single productId
router.get("/:id", authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID format" });
    }

    const product = await Product.findById(req.params.id).populate("category");

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product (admin only)
router.post("/", authenticate, isAdmin, validateProduct, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      costPrice,
      category,
      warehouseQuantity,
      image,
      sku,
      color,
    } = req.body;

    if (!isValidObjectId(category)) {
      return res.status(400).json({ error: "Invalid category ID format" });
    }

    const categoryExists = await Category.exists({ _id: category });

    if (!categoryExists) {
      return res.status(400).json({ error: "Category not found" });
    }

    const product = await Product.create({
      name,
      description,
      price,
      costPrice,
      category,
      warehouseQuantity,
      image,
      sku,
      color,
    });

    res.status(201).json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product (admin only)
router.put("/:id", authenticate, isAdmin, validateProduct, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID format" });
    }

    const {
      name,
      description,
      price,
      costPrice,
      category,
      warehouseQuantity,
      image,
      sku,
      color,
      isActive,
    } = req.body;

    if (!isValidObjectId(category)) {
      return res.status(400).json({ error: "Invalid category ID format" });
    }

    const categoryExists = await Category.exists({ _id: category });

    if (!categoryExists) {
      return res.status(400).json({ error: "Category not found" });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price,
        costPrice,
        category,
        warehouseQuantity,
        image,
        sku,
        color,
        isActive,
      },
      { new: true, runValidators: true },
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Partial update product
router.patch("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID format" });
    }

    const allowedFields = [
      "name",
      "description",
      "price",
      "costPrice",
      "category",
      "warehouseQuantity",
      "image",
      "sku",
      "color",
      "isActive",
    ];

    const updates = {};

    for (const field of allowedFields) {
      // Use 'in' operator instead of truthiness to allow 0, false, ""
      if (field in req.body) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    if (updates.category) {
      if (!isValidObjectId(updates.category)) {
        return res.status(400).json({ error: "Invalid category ID format" });
      }
      const categoryExists = await Category.exists({ _id: updates.category });
      if (!categoryExists) {
        return res.status(404).json({ error: "Category not found" });
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product (admin only) — soft delete
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID format" });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted successfully (soft)", product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/products/{id}/hard:
 *   delete:
 *     summary: Permanently delete a product (Hard Delete)
 *     tags: [Products]
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product permanently deleted
 *       400:
 *         description: Cannot delete product with sales history
 */
router.delete("/:id/hard", authenticate, isAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid product ID format" });
    }

    // 1. Safety Check: Check if any sales exist for this product
    const salesExist = await Sale.exists({ product: id });
    if (salesExist) {
        return res.status(400).json({
            error: "Bu mahsulot sotilgan (sales history mavjud). Uni butunlay o'chirib bo'lmaydi. Soft Delete qiling (isActive: false)."
        });
    }

    // 2. Transaksiya orqali hamma bog'liq joylardan o'chirish
    let deletedProduct;
    await session.withTransaction(async () => {
        deletedProduct = await Product.findByIdAndDelete(id).session(session);

        if (!deletedProduct) {
            throw new Error("Mahsulot topilmadi");
        }

        // Kaskadli o'chirish
        await SellerStock.deleteMany({ product: id }).session(session);
        await SellerProduct.deleteMany({ product: id }).session(session);
        await Transfer.deleteMany({ product: id }).session(session);
    });

    res.json({
        message: "Mahsulot butunlay o'chirildi (hard delete)",
        deletedProduct
    });
  } catch (error) {
    console.error("Hard delete error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

module.exports = router;

