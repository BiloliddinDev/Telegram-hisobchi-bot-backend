/**
 * Export Configuration
 *
 * This file defines which fields should be exported for each model.
 * You can customize this to control what data is included in exports.
 *
 * Configuration options for each model:
 * - select: Mongoose select string (space-separated field names to include)
 * - excludeFields: Array of additional fields to exclude (beyond default sensitive fields)
 * - includeFields: Array to whitelist only specific fields (overrides select)
 * - populate: Array of population options for referenced fields
 */

module.exports = {
  // User model export configuration
  users: {
    // Only export safe, non-sensitive user fields
    select:
      "username firstName lastName phoneNumber role isActive createdAt updatedAt",

    // Additional fields to exclude (beyond default sensitive fields like password)
    excludeFields: ["telegramId", "avatarUrl"],

    // Alternative: Explicitly list fields to include (uncomment to use)
    // includeFields: ['username', 'firstName', 'lastName', 'role', 'createdAt'],

    populate: [],
  },

  // Category model export configuration
  categories: {
    select: "name createdAt updatedAt",
    excludeFields: [],
    populate: [],
  },

  // Product model export configuration
  products: {
    select:
      "name sku price costPrice category warehouseQuantity description createdAt updatedAt",
    excludeFields: [],
    populate: [{ path: "category", select: "name" }],
  },

  // Sales model export configuration
  sales: {
    select:
      "seller product quantity price totalAmount timestamp createdAt updatedAt",
    excludeFields: [],
    populate: [
      { path: "seller", select: "username firstName lastName" },
      { path: "product", select: "name sku price" },
    ],
  },

  // Transfer model export configuration
  transfers: {
    select: "seller product quantity type status createdAt updatedAt",
    excludeFields: [],
    populate: [
      { path: "seller", select: "username firstName lastName" },
      { path: "product", select: "name sku" },
    ],
  },

  // SellerProduct model export configuration
  sellerProducts: {
    select: "seller product isActive createdAt updatedAt",
    excludeFields: [],
    populate: [
      { path: "seller", select: "username firstName lastName" },
      { path: "product", select: "name sku price costPrice" },
    ],
  },

  // SellerStock model export configuration
  sellerStock: {
    select: "seller product quantity createdAt updatedAt",
    excludeFields: [],
    populate: [
      { path: "seller", select: "username firstName lastName" },
      { path: "product", select: "name sku" },
    ],
  },

  // Global settings
  global: {
    // Default sensitive fields that are ALWAYS excluded
    defaultSensitiveFields: [
      "password",
      "passwordHash",
      "hash",
      "salt",
      "token",
      "refreshToken",
      "accessToken",
      "apiKey",
      "apiSecret",
      "secret",
      "privateKey",
      "otp",
      "resetToken",
      "__v",
      "_id",
    ],

    // Export format settings
    formatting: {
      // Apply professional styling
      enableStyling: true,

      // Auto-fit column widths
      autoFitColumns: true,

      // Add alternating row colors
      alternatingRows: true,

      // Enable filters on headers
      enableFilters: true,

      // Date format for date fields
      dateFormat: "YYYY-MM-DD HH:mm:ss",
    },

    // Performance settings
    performance: {
      // Maximum records per collection (0 = no limit)
      maxRecordsPerCollection: 0,

      // Use lean queries for better performance
      useLeanQueries: true,

      // Batch size for processing large collections
      batchSize: 1000,
    },
  },
};

/**
 * USAGE EXAMPLES:
 *
 * 1. To export only specific user fields:
 *    users: {
 *      includeFields: ['username', 'email', 'role', 'createdAt']
 *    }
 *
 * 2. To exclude specific fields:
 *    products: {
 *      excludeFields: ['internalNotes', 'supplierCost']
 *    }
 *
 * 3. To include all fields except sensitive ones:
 *    sales: {
 *      select: '' // Empty string = all fields
 *    }
 *
 * 4. To customize populated fields:
 *    sales: {
 *      populate: [
 *        { path: 'seller', select: 'username email' },
 *        { path: 'product', select: 'name price stock' }
 *      ]
 *    }
 *
 * 5. To add custom fields from virtuals or computed properties:
 *    // Modify the exportModelToWorksheet function in excelExporter.js
 */

/**
 * SECURITY NOTES:
 *
 * - Never export password fields or authentication tokens
 * - Be careful with personally identifiable information (PII)
 * - Consider data privacy regulations (GDPR, CCPA, etc.)
 * - Use environment-specific configurations for different deployments
 * - Regularly audit what fields are being exported
 * - Limit access to export functionality to admin users only
 */
