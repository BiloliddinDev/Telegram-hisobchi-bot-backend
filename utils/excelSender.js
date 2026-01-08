const { exportAllTablesToExcel } = require('./excelExporter');
const fs = require('fs').promises;
const path = require('path');

/**
 * Send Excel file to external API
 * @param {string} apiUrl - The URL of the external API
 * @param {Object} options - Additional options (headers, method, etc.)
 */
const sendExcelToAPI = async (apiUrl, options = {}) => {
  try {
    console.log('Generating Excel file...');
    const { workbook, stats } = await exportAllTablesToExcel();

    // Create temporary file
    const tempDir = path.join(__dirname, '..', 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `database_export_${timestamp}.xlsx`;
    const filePath = path.join(tempDir, filename);

    // Write to file
    await workbook.xlsx.writeFile(filePath);
    console.log(`Excel file created: ${filePath}`);

    // Read file as buffer
    const fileBuffer = await fs.readFile(filePath);

    // Prepare FormData for API call
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fileBuffer, {
      filename: filename,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Add any additional fields
    if (options.additionalFields) {
      Object.entries(options.additionalFields).forEach(([key, value]) => {
        form.append(key, value);
      });
    }

    // Make API call
    const axios = require('axios');
    const response = await axios.post(apiUrl, form, {
      headers: {
        ...form.getHeaders(),
        ...options.headers
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    // Clean up temp file
    await fs.unlink(filePath);
    console.log('Temporary file deleted');

    return {
      success: true,
      response: response.data,
      stats: stats
    };

  } catch (error) {
    console.error('Error sending Excel to API:', error);
    throw error;
  }
};

/**
 * Send Excel file via Telegram Bot
 * @param {string} chatId - Telegram chat ID
 * @param {Object} bot - Telegram bot instance
 */
const sendExcelViaTelegram = async (chatId, bot) => {
  try {
    console.log('Generating Excel file for Telegram...');
    const { workbook, stats } = await exportAllTablesToExcel();

    // Create temporary file
    const tempDir = path.join(__dirname, '..', 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database_export_${timestamp}.xlsx`;
    const filePath = path.join(tempDir, filename);

    // Write to file
    await workbook.xlsx.writeFile(filePath);
    console.log(`Excel file created: ${filePath}`);

    // Prepare caption with stats
    const totalRecords = stats.reduce((sum, stat) => sum + stat.count, 0);
    const caption = `📊 *Database Export*\n\n` +
      `📅 Date: ${new Date().toLocaleString()}\n` +
      `📈 Total Records: ${totalRecords}\n\n` +
      stats.map(s => `• ${s.name}: ${s.count}`).join('\n');

    // Send file via Telegram
    await bot.sendDocument(chatId, filePath, {
      caption: caption,
      parse_mode: 'Markdown'
    });

    // Clean up temp file
    await fs.unlink(filePath);
    console.log('File sent via Telegram and temp file deleted');

    return {
      success: true,
      stats: stats
    };

  } catch (error) {
    console.error('Error sending Excel via Telegram:', error);
    throw error;
  }
};

/**
 * Save Excel file to local directory
 */
const saveExcelToFile = async (outputPath) => {
  try {
    const { workbook, stats } = await exportAllTablesToExcel();

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    await workbook.xlsx.writeFile(outputPath);
    console.log(`Excel file saved to: ${outputPath}`);

    return {
      success: true,
      path: outputPath,
      stats: stats
    };
  } catch (error) {
    console.error('Error saving Excel file:', error);
    throw error;
  }
};

/**
 * Get Excel file as buffer (for direct response streaming)
 */
const getExcelBuffer = async () => {
  try {
    const { workbook, stats } = await exportAllTablesToExcel();

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: buffer,
      stats: stats,
      filename: `database_export_${new Date().toISOString().split('T')[0]}.xlsx`
    };
  } catch (error) {
    console.error('Error creating Excel buffer:', error);
    throw error;
  }
};

module.exports = {
  sendExcelToAPI,
  sendExcelViaTelegram,
  saveExcelToFile,
  getExcelBuffer
};
