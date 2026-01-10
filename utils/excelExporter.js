const ExcelJS = require("exceljs");
const mongoose = require("mongoose");

// Import all models
const User = require("../models/User");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const Transfer = require("../models/Transfer");
const SellerProduct = require("../models/SellerProduct");
const SellerStock = require("../models/SellerStock");

// Import export configuration
const exportConfig = require("../config/exportConfig");

/**
 * Format cell value for Excel
 */
const formatCellValue = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (mongoose.Types.ObjectId.isValid(value) && typeof value === "object") {
    return value.toString();
  }
  if (typeof value === "object") return JSON.stringify(value);
  return value;
};

/**
 * Apply styling to header row
 */
const styleHeaderRow = (worksheet) => {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 25;
};

/**
 * Auto-fit columns based on content
 */
const autoFitColumns = (worksheet) => {
  worksheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const cellLength = cell.value ? cell.value.toString().length : 10;
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });
    column.width = Math.min(maxLength + 2, 50);
  });
};

/**
 * Add alternating row colors
 */
const addAlternatingRowColors = (worksheet, startRow = 2) => {
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber >= startRow && rowNumber % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F2F2" },
      };
    }
  });
};

/**
 * Export a single model to worksheet
 */
const exportModelToWorksheet = async (
  workbook,
  modelName,
  Model,
  options = {},
) => {
  try {
    console.log(`Exporting ${modelName}...`);

    // Fetch data with population if needed
    let query = Model.find({});

    // Apply field selection if specified
    if (options.select) {
      query = query.select(options.select);
    }

    // Apply population based on model
    if (options.populate) {
      options.populate.forEach((pop) => {
        query = query.populate(pop);
      });
    }

    const data = await query.lean().exec();

    if (data.length === 0) {
      console.log(`No data found for ${modelName}`);
      return 0;
    }

    // Create worksheet
    const worksheet = workbook.addWorksheet(modelName);

    // Get sensitive fields from config or use defaults
    const sensitiveFields = exportConfig.global?.defaultSensitiveFields || [
      "password",
      "passwordHash",
      "token",
      "refreshToken",
      "apiKey",
      "secret",
      "__v",
      "_id",
    ];

    // Get fields to exclude (sensitive + custom excludes)
    const excludeFields = [
      ...sensitiveFields,
      ...(options.excludeFields || []),
    ];

    // Get all unique keys from the data
    const allKeys = new Set();
    data.forEach((item) => {
      Object.keys(item).forEach((key) => {
        // Exclude sensitive fields and version key
        if (!excludeFields.includes(key)) {
          allKeys.add(key);
        }
      });
    });

    // If specific fields are requested, filter to only those
    let fieldsToExport = Array.from(allKeys);
    if (options.includeFields && options.includeFields.length > 0) {
      fieldsToExport = fieldsToExport.filter((key) =>
        options.includeFields.includes(key),
      );
    }

    const columns = fieldsToExport.map((key) => ({
      header:
        key.charAt(0).toUpperCase() +
        key
          .slice(1)
          .replace(/([A-Z])/g, " $1")
          .trim(),
      key: key,
      width: 15,
    }));

    worksheet.columns = columns;

    // Add data rows
    data.forEach((item) => {
      const row = {};
      columns.forEach((col) => {
        let value = item[col.key];

        // Handle populated references
        if (
          value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          !(value instanceof Date)
        ) {
          if (value.username) value = value.username;
          else if (value.firstName && value.lastName)
            value = `${value.firstName} ${value.lastName}`;
          else if (value.name) value = value.name;
          else if (value._id) value = value._id.toString();
        }

        row[col.key] = formatCellValue(value);
      });
      worksheet.addRow(row);
    });

    // Apply styling
    styleHeaderRow(worksheet);
    autoFitColumns(worksheet);
    addAlternatingRowColors(worksheet);

    // Add filters
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };

    console.log(`${modelName} exported: ${data.length} records`);

    return data.length;
  } catch (error) {
    console.error(`Error exporting ${modelName}:`, error);
    throw error;
  }
};

/**
 * Create summary worksheet
 */
const createSummaryWorksheet = (workbook, stats) => {
  const worksheet = workbook.addWorksheet("Summary", {
    properties: { tabColor: { argb: "FF00FF00" } },
  });

  worksheet.columns = [
    { header: "Collection", key: "collection", width: 30 },
    { header: "Record Count", key: "count", width: 20 },
    { header: "Export Date", key: "date", width: 25 },
  ];

  const exportDate = new Date().toLocaleString();

  stats.forEach((stat) => {
    worksheet.addRow({
      collection: stat.name,
      count: stat.count,
      date: exportDate,
    });
  });

  // Add total row
  const totalCount = stats.reduce((sum, stat) => sum + stat.count, 0);
  worksheet.addRow({
    collection: "TOTAL",
    count: totalCount,
    date: "",
  });

  // Style header
  styleHeaderRow(worksheet);

  // Style total row
  const lastRow = worksheet.lastRow;
  lastRow.font = { bold: true };
  lastRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFEB3B" },
  };

  autoFitColumns(worksheet);
};

/**
 * Main export function - exports all database tables to Excel
 */
const exportAllTablesToExcel = async (options = {}) => {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Telegram Hisobchi Bot";
  workbook.created = new Date();
  workbook.modified = new Date();

  const stats = [];

  // Define models to export with their configuration
  // Configuration is loaded from config/exportConfig.js
  const modelsToExport = [
    {
      name: "Users",
      model: User,
      ...exportConfig.users,
    },
    {
      name: "Categories",
      model: Category,
      ...exportConfig.categories,
    },
    {
      name: "Products",
      model: Product,
      ...exportConfig.products,
    },
    {
      name: "Sales",
      model: Sale,
      ...exportConfig.sales,
    },
    {
      name: "Transfers",
      model: Transfer,
      ...exportConfig.transfers,
    },
    {
      name: "SellerProducts",
      model: SellerProduct,
      ...exportConfig.sellerProducts,
    },
    {
      name: "SellerStock",
      model: SellerStock,
      ...exportConfig.sellerStock,
    },
  ];

  // Export each model
  for (const modelConfig of modelsToExport) {
    try {
      const count = await exportModelToWorksheet(
        workbook,
        modelConfig.name,
        modelConfig.model,
        {
          populate: modelConfig.populate,
          select: modelConfig.select,
          excludeFields: modelConfig.excludeFields,
        },
      );

      stats.push({ name: modelConfig.name, count: count || 0 });
    } catch (error) {
      console.error(`Failed to export ${modelConfig.name}:`, error);
      stats.push({ name: modelConfig.name, count: 0, error: error.message });
    }
  }

  // Create summary worksheet
  createSummaryWorksheet(workbook, stats);

  return { workbook, stats };
};

module.exports = {
  exportAllTablesToExcel,
  exportModelToWorksheet,
  formatCellValue,
};
