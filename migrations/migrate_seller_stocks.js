const mongoose = require("mongoose");
const Product = require("../models/Product");
const SellerStock = require("../models/SellerStock");

/**
 * Migration script to move sellerStocks from embedded arrays in Product model
 * to separate SellerStock collection
 */
async function migrateSellerStocks() {
  try {
    console.log("Starting seller stocks migration...");

    // Find all products that have sellerStocks embedded array
    const products = await Product.find({ sellerStocks: { $exists: true, $ne: [] } });

    if (products.length === 0) {
      console.log("No products with embedded sellerStocks found. Migration not needed.");
      return;
    }

    console.log(`Found ${products.length} products with embedded sellerStocks`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        console.log(`Migrating sellerStocks for product: ${product.name} (${product._id})`);

        if (product.sellerStocks && product.sellerStocks.length > 0) {
          for (const sellerStock of product.sellerStocks) {
            try {
              // Check if this seller-product combination already exists in SellerStock collection
              const existingStock = await SellerStock.findOne({
                seller: sellerStock.sellerId,
                product: product._id
              });

              if (existingStock) {
                // Update existing stock by adding quantities
                existingStock.quantity += sellerStock.quantity || 0;
                existingStock.lastTransferDate = new Date();
                await existingStock.save();
                console.log(`  Updated existing stock: Seller ${sellerStock.sellerId}, quantity +${sellerStock.quantity}`);
              } else {
                // Create new SellerStock record
                await SellerStock.create({
                  seller: sellerStock.sellerId,
                  product: product._id,
                  quantity: sellerStock.quantity || 0,
                  lastTransferDate: new Date()
                });
                console.log(`  Created new stock: Seller ${sellerStock.sellerId}, quantity ${sellerStock.quantity}`);
              }
              migratedCount++;
            } catch (stockError) {
              console.error(`  Error migrating stock for seller ${sellerStock.sellerId}:`, stockError.message);
              errorCount++;
            }
          }
        }

        // Remove sellerStocks array from product after migration
        await Product.findByIdAndUpdate(
          product._id,
          { $unset: { sellerStocks: 1 } }
        );
        console.log(`  Removed sellerStocks array from product ${product.name}`);

      } catch (productError) {
        console.error(`Error migrating product ${product._id}:`, productError.message);
        errorCount++;
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Successfully migrated: ${migratedCount} seller stocks`);
    console.log(`Errors encountered: ${errorCount}`);
    console.log(`Products processed: ${products.length}`);
    console.log("Migration completed!");

  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Rollback function to restore sellerStocks to Product model (for emergency use)
 */
async function rollbackMigration() {
  try {
    console.log("Starting rollback of seller stocks migration...");

    const sellerStocks = await SellerStock.find()
      .populate('product')
      .populate('seller');

    const productStockMap = new Map();

    // Group stocks by product
    for (const stock of sellerStocks) {
      if (!productStockMap.has(stock.product._id.toString())) {
        productStockMap.set(stock.product._id.toString(), []);
      }

      productStockMap.get(stock.product._id.toString()).push({
        sellerId: stock.seller._id,
        quantity: stock.quantity
      });
    }

    // Update products with sellerStocks arrays
    for (const [productId, stocks] of productStockMap) {
      await Product.findByIdAndUpdate(
        productId,
        { $set: { sellerStocks: stocks } }
      );
      console.log(`Restored sellerStocks for product ${productId}: ${stocks.length} stocks`);
    }

    console.log("Rollback completed. Note: You may want to manually remove SellerStock collection.");

  } catch (error) {
    console.error("Rollback failed:", error);
    throw error;
  }
}

/**
 * Validation function to check migration integrity
 */
async function validateMigration() {
  try {
    console.log("Validating migration...");

    // Check if any products still have sellerStocks arrays
    const productsWithEmbedded = await Product.find({ sellerStocks: { $exists: true } });

    if (productsWithEmbedded.length > 0) {
      console.warn(`Warning: ${productsWithEmbedded.length} products still have sellerStocks arrays`);
      productsWithEmbedded.forEach(p => {
        console.warn(`  - Product: ${p.name} (${p._id}) has ${p.sellerStocks?.length || 0} embedded stocks`);
      });
    } else {
      console.log("✓ No products have embedded sellerStocks arrays");
    }

    // Count SellerStock records
    const sellerStockCount = await SellerStock.countDocuments();
    console.log(`✓ SellerStock collection contains ${sellerStockCount} records`);

    // Check for duplicate seller-product combinations
    const duplicates = await SellerStock.aggregate([
      {
        $group: {
          _id: { seller: "$seller", product: "$product" },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicates.length > 0) {
      console.warn(`Warning: Found ${duplicates.length} duplicate seller-product combinations`);
      duplicates.forEach(dup => {
        console.warn(`  - Seller: ${dup._id.seller}, Product: ${dup._id.product}, Count: ${dup.count}`);
      });
    } else {
      console.log("✓ No duplicate seller-product combinations found");
    }

    console.log("Validation completed!");

  } catch (error) {
    console.error("Validation failed:", error);
    throw error;
  }
}

// Export functions for use
module.exports = {
  migrateSellerStocks,
  rollbackMigration,
  validateMigration
};

// Allow direct execution of migration
if (require.main === module) {
  const command = process.argv[2];

  // Connect to MongoDB
  mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/telegram-bot", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  switch (command) {
    case 'migrate':
      migrateSellerStocks()
        .then(() => process.exit(0))
        .catch((error) => {
          console.error(error);
          process.exit(1);
        });
      break;

    case 'rollback':
      rollbackMigration()
        .then(() => process.exit(0))
        .catch((error) => {
          console.error(error);
          process.exit(1);
        });
      break;

    case 'validate':
      validateMigration()
        .then(() => process.exit(0))
        .catch((error) => {
          console.error(error);
          process.exit(1);
        });
      break;

    default:
      console.log("Usage:");
      console.log("  node migrate_seller_stocks.js migrate   - Migrate embedded sellerStocks to separate table");
      console.log("  node migrate_seller_stocks.js rollback  - Rollback migration (emergency use)");
      console.log("  node migrate_seller_stocks.js validate  - Validate migration integrity");
      process.exit(1);
  }
}
