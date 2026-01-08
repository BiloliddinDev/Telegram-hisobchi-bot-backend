/**
 * Example Usage Script for Database Export
 *
 * This script demonstrates how to use the export utilities directly
 * without going through the API endpoints.
 *
 * Usage:
 *   node examples/export-example.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { exportAllTablesToExcel } = require('../utils/excelExporter');
const { saveExcelToFile, sendExcelToAPI, getExcelBuffer } = require('../utils/excelSender');

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-bot';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Example 1: Export to Excel file
async function example1_ExportToFile() {
  console.log('\n📊 Example 1: Export to Local File');
  console.log('═'.repeat(50));

  try {
    const outputPath = './exports/backup.xlsx';
    const result = await saveExcelToFile(outputPath);

    console.log('✅ Export successful!');
    console.log('📁 File saved to:', result.path);
    console.log('📈 Statistics:');
    result.stats.forEach(stat => {
      console.log(`   - ${stat.name}: ${stat.count} records`);
    });

    const totalRecords = result.stats.reduce((sum, s) => sum + s.count, 0);
    console.log(`   📊 Total: ${totalRecords} records`);

  } catch (error) {
    console.error('❌ Export failed:', error.message);
  }
}

// Example 2: Get workbook for custom processing
async function example2_CustomProcessing() {
  console.log('\n🔧 Example 2: Custom Processing');
  console.log('═'.repeat(50));

  try {
    const { workbook, stats } = await exportAllTablesToExcel();

    console.log('✅ Workbook generated!');
    console.log('📋 Available worksheets:');
    workbook.eachSheet((worksheet, sheetId) => {
      console.log(`   ${sheetId}. ${worksheet.name} (${worksheet.rowCount - 1} rows)`);
    });

    // Example: Add a custom worksheet
    const customSheet = workbook.addWorksheet('Custom Report');
    customSheet.columns = [
      { header: 'Report Type', key: 'type', width: 20 },
      { header: 'Generated At', key: 'date', width: 25 },
      { header: 'Total Records', key: 'total', width: 15 }
    ];

    const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);
    customSheet.addRow({
      type: 'Full Database Export',
      date: new Date().toISOString(),
      total: totalRecords
    });

    // Save with custom modifications
    await workbook.xlsx.writeFile('./exports/custom_export.xlsx');
    console.log('✅ Custom export saved to: ./exports/custom_export.xlsx');

  } catch (error) {
    console.error('❌ Custom processing failed:', error.message);
  }
}

// Example 3: Get buffer for API response
async function example3_GetBuffer() {
  console.log('\n💾 Example 3: Get Excel Buffer');
  console.log('═'.repeat(50));

  try {
    const { buffer, stats, filename } = await getExcelBuffer();

    console.log('✅ Buffer generated!');
    console.log('📦 Buffer size:', (buffer.length / 1024).toFixed(2), 'KB');
    console.log('📄 Suggested filename:', filename);
    console.log('📊 Contains', stats.length, 'collections');

    // You could now send this buffer in an HTTP response
    // res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    // res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // res.send(buffer);

  } catch (error) {
    console.error('❌ Buffer generation failed:', error.message);
  }
}

// Example 4: Send to external API (requires API URL)
async function example4_SendToAPI() {
  console.log('\n🌐 Example 4: Send to External API');
  console.log('═'.repeat(50));

  const apiUrl = process.env.EXTERNAL_API_URL;

  if (!apiUrl) {
    console.log('⚠️  Skipped: Set EXTERNAL_API_URL in .env to test this example');
    return;
  }

  try {
    const result = await sendExcelToAPI(apiUrl, {
      headers: {
        'X-API-Key': process.env.EXTERNAL_API_KEY || '',
        'X-Source': 'telegram-bot-export'
      },
      additionalFields: {
        description: 'Automated database export',
        timestamp: Date.now(),
        environment: process.env.NODE_ENV || 'development'
      }
    });

    console.log('✅ Sent to API successfully!');
    console.log('📡 Response:', JSON.stringify(result.response, null, 2));
    console.log('📊 Exported records:');
    result.stats.forEach(stat => {
      console.log(`   - ${stat.name}: ${stat.count} records`);
    });

  } catch (error) {
    console.error('❌ API send failed:', error.message);
  }
}

// Example 5: Statistics only
async function example5_GetStatistics() {
  console.log('\n📈 Example 5: Get Statistics Only');
  console.log('═'.repeat(50));

  try {
    const User = require('../models/User');
    const Category = require('../models/Category');
    const Product = require('../models/Product');
    const Sale = require('../models/Sale');
    const Transfer = require('../models/Transfer');
    const SellerProduct = require('../models/SellerProduct');
    const SellerStock = require('../models/SellerStock');

    console.log('📊 Counting documents...\n');

    const stats = await Promise.all([
      User.countDocuments(),
      Category.countDocuments(),
      Product.countDocuments(),
      Sale.countDocuments(),
      Transfer.countDocuments(),
      SellerProduct.countDocuments(),
      SellerStock.countDocuments()
    ]);

    const collections = [
      { name: 'Users', count: stats[0], icon: '👤' },
      { name: 'Categories', count: stats[1], icon: '📁' },
      { name: 'Products', count: stats[2], icon: '📦' },
      { name: 'Sales', count: stats[3], icon: '💰' },
      { name: 'Transfers', count: stats[4], icon: '🔄' },
      { name: 'SellerProducts', count: stats[5], icon: '🛍️' },
      { name: 'SellerStock', count: stats[6], icon: '📊' }
    ];

    collections.forEach(col => {
      console.log(`${col.icon} ${col.name.padEnd(20)} ${col.count.toString().padStart(8)} records`);
    });

    const total = stats.reduce((sum, count) => sum + count, 0);
    console.log('─'.repeat(50));
    console.log(`📈 Total Records:        ${total.toString().padStart(8)}`);

    // Estimate file size (rough approximation: ~100 bytes per record)
    const estimatedSize = (total * 100 / 1024).toFixed(2);
    console.log(`💾 Estimated export size: ~${estimatedSize} KB`);

  } catch (error) {
    console.error('❌ Statistics failed:', error.message);
  }
}

// Example 6: Scheduled export simulation
async function example6_ScheduledExport() {
  console.log('\n⏰ Example 6: Scheduled Export (Simulation)');
  console.log('═'.repeat(50));

  try {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `./exports/scheduled_backup_${dateStr}_${timeStr}.xlsx`;

    console.log('⏰ Running scheduled backup at:', date.toLocaleString());
    console.log('📁 Output file:', filename);

    const result = await saveExcelToFile(filename);

    console.log('✅ Scheduled backup completed!');
    console.log('📊 Summary:');
    result.stats.forEach(stat => {
      if (stat.count > 0) {
        console.log(`   ✓ ${stat.name}: ${stat.count} records exported`);
      }
    });

    const totalRecords = result.stats.reduce((sum, s) => sum + s.count, 0);
    console.log(`\n📈 Total exported: ${totalRecords} records`);

    // In production, you would use node-cron:
    console.log('\n💡 To schedule this automatically, use node-cron:');
    console.log('   npm install node-cron');
    console.log('   cron.schedule("0 3 * * *", () => { ... })');

  } catch (error) {
    console.error('❌ Scheduled export failed:', error.message);
  }
}

// Main function to run all examples
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Database Export Examples - Telegram Bot       ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  await connectDB();

  // Create exports directory if it doesn't exist
  const fs = require('fs');
  if (!fs.existsSync('./exports')) {
    fs.mkdirSync('./exports', { recursive: true });
    console.log('📁 Created exports directory');
  }

  // Run examples
  try {
    await example5_GetStatistics();
    await example1_ExportToFile();
    await example2_CustomProcessing();
    await example3_GetBuffer();
    await example4_SendToAPI();
    await example6_ScheduledExport();

    console.log('\n✅ All examples completed successfully!');
    console.log('\n📚 Check the following files:');
    console.log('   - ./exports/backup.xlsx');
    console.log('   - ./exports/custom_export.xlsx');
    console.log('   - ./exports/scheduled_backup_*.xlsx');

  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
    console.log('👋 Goodbye!\n');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export functions for use in other scripts
module.exports = {
  example1_ExportToFile,
  example2_CustomProcessing,
  example3_GetBuffer,
  example4_SendToAPI,
  example5_GetStatistics,
  example6_ScheduledExport
};
