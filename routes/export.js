const express = require("express");
const router = express.Router();
const { authenticate, isAdmin } = require("../middleware/auth");
const { exportAllTablesToExcel } = require("../utils/excelExporter");
const {
  sendExcelToAPI,
  sendExcelViaTelegram,
} = require("../utils/excelSender");

// Helper: validate URL format and block private/internal addresses (SSRF protection)
const isAllowedUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    // Block private/internal hostnames
    const hostname = url.hostname.toLowerCase();
    const blocked = [
      'localhost', '127.0.0.1', '0.0.0.0', '::1',
      '169.254.169.254', // Cloud metadata
      'metadata.google.internal',
    ];
    if (blocked.includes(hostname)) return false;
    // Block private IP ranges (10.x, 172.16-31.x, 192.168.x)
    const parts = hostname.split('.');
    if (parts.length === 4 && parts.every(p => !isNaN(p))) {
      const [a, b] = parts.map(Number);
      if (a === 10) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
    }
    return true;
  } catch {
    return false;
  }
};

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

    // Write to buffer first to get Content-Length and avoid
    // ERR_HTTP_HEADERS_SENT if streaming fails mid-response
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.byteLength);

    // Send buffer
    res.send(Buffer.from(buffer));

    console.log("Database export completed successfully");
    console.log("Export stats:", stats);
  } catch (error) {
    console.error("Error exporting database:", error);
    // Only send error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to export database",
        message: error.message,
      });
    }
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

        if (!isAllowedUrl(apiUrl)) {
          return res.status(400).json({
            error: "Invalid or disallowed API URL",
            message: "URL must be a valid public HTTP/HTTPS address",
          });
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
