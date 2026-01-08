const express = require("express");
const router = express.Router();
const { authenticate, isAdmin } = require("../middleware/auth");
const { exportAllTablesToExcel } = require("../utils/excelExporter");
const {
  sendExcelToAPI,
  sendExcelViaTelegram,
} = require("../utils/excelSender");

/**
 * @swagger
 * /api/export/database:
 *   get:
 *     summary: Export all database tables to Excel
 *     tags: [Export]
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [xlsx, csv]
 *           default: xlsx
 *         description: Export format
 *       - in: query
 *         name: download
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Whether to download the file
 *     responses:
 *       200:
 *         description: Excel file with all database tables
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.get("/database", authenticate, isAdmin, async (req, res) => {
  try {
    console.log("Starting database export...");

    const { workbook, stats } = await exportAllTablesToExcel();

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const filename = `database_export_${timestamp}.xlsx`;

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);

    console.log("Database export completed successfully");
    console.log("Export stats:", stats);
  } catch (error) {
    console.error("Error exporting database:", error);
    res.status(500).json({
      error: "Failed to export database",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/export/database/info:
 *   get:
 *     summary: Get database export statistics
 *     tags: [Export]
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Database statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get("/database/info", authenticate, isAdmin, async (req, res) => {
  try {
    const User = require("../models/User");
    const Category = require("../models/Category");
    const Product = require("../models/Product");
    const Sale = require("../models/Sale");
    const Transfer = require("../models/Transfer");
    const SellerProduct = require("../models/SellerProduct");
    const SellerStock = require("../models/SellerStock");

    const stats = await Promise.all([
      User.countDocuments(),
      Category.countDocuments(),
      Product.countDocuments(),
      Sale.countDocuments(),
      Transfer.countDocuments(),
      SellerProduct.countDocuments(),
      SellerStock.countDocuments(),
    ]);

    const info = {
      collections: [
        { name: "Users", count: stats[0] },
        { name: "Categories", count: stats[1] },
        { name: "Products", count: stats[2] },
        { name: "Sales", count: stats[3] },
        { name: "Transfers", count: stats[4] },
        { name: "SellerProducts", count: stats[5] },
        { name: "SellerStock", count: stats[6] },
      ],
      totalRecords: stats.reduce((sum, count) => sum + count, 0),
      exportDate: new Date().toISOString(),
    };

    res.json(info);
  } catch (error) {
    console.error("Error getting database info:", error);
    res.status(500).json({
      error: "Failed to get database info",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/export/custom:
 *   post:
 *     summary: Export custom selection of tables
 *     tags: [Export]
 *     security:
 *       - TelegramAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               collections:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Users", "Sales", "Products"]
 *     responses:
 *       200:
 *         description: Excel file with selected tables
 *       401:
 *         description: Unauthorized
 */
router.post("/custom", authenticate, isAdmin, async (req, res) => {
  try {
    const { collections } = req.body;

    if (
      !collections ||
      !Array.isArray(collections) ||
      collections.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Please provide collections array" });
    }

    // TODO: Implement custom collection export
    res.status(501).json({ message: "Custom export not yet implemented" });
  } catch (error) {
    console.error("Error in custom export:", error);
    res.status(500).json({
      error: "Failed to export custom data",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/export/send:
 *   post:
 *     summary: Send database export to external destination
 *     tags: [Export]
 *     security:
 *       - TelegramAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - destination
 *             properties:
 *               destination:
 *                 type: string
 *                 enum: [telegram, api, email]
 *                 description: Where to send the export
 *               telegramChatId:
 *                 type: string
 *                 description: Telegram chat ID (required if destination is telegram)
 *               apiUrl:
 *                 type: string
 *                 description: External API URL (required if destination is api)
 *               apiHeaders:
 *                 type: object
 *                 description: Additional headers for API call
 *     responses:
 *       200:
 *         description: Export sent successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/send", authenticate, isAdmin, async (req, res) => {
  try {
    const {
      destination,
      telegramChatId,
      apiUrl,
      apiHeaders,
      additionalFields,
    } = req.body;

    if (!destination) {
      return res.status(400).json({ error: "Destination is required" });
    }

    let result;

    switch (destination) {
      case "telegram":
        if (!telegramChatId) {
          return res
            .status(400)
            .json({ error: "Telegram chat ID is required" });
        }

        // Check if bot is available
        try {
          const bot = require("../bot/index");
          if (!bot) {
            throw new Error("Bot not initialized");
          }
          result = await sendExcelViaTelegram(telegramChatId, bot);
        } catch (botError) {
          console.error("Bot error:", botError);
          return res.status(500).json({
            error: "Telegram bot not available",
            message: "Please ensure the bot is properly configured",
          });
        }
        break;

      case "api":
        if (!apiUrl) {
          return res.status(400).json({ error: "API URL is required" });
        }

        result = await sendExcelToAPI(apiUrl, {
          headers: apiHeaders || {},
          additionalFields: additionalFields || {},
        });
        break;

      case "email":
        return res.status(501).json({
          error: "Email sending not yet implemented",
          message: "Please use telegram or api destination",
        });

      default:
        return res.status(400).json({ error: "Invalid destination" });
    }

    res.json({
      success: true,
      message: `Export sent via ${destination}`,
      ...result,
    });
  } catch (error) {
    console.error("Error sending export:", error);
    res.status(500).json({
      error: "Failed to send export",
      message: error.message,
    });
  }
});

module.exports = router;
