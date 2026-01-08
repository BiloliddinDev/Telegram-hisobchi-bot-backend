# Database Export Documentation

This documentation explains how to export all database tables to Excel and send them via API or Telegram.

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [API Endpoints](#api-endpoints)
- [Frontend Integration](#frontend-integration)
- [Backend Usage](#backend-usage)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- ✅ Export all database collections to a single Excel file
- ✅ Each collection in a separate worksheet with professional formatting
- ✅ Summary worksheet with statistics and record counts
- ✅ Populated references (shows names instead of ObjectIds)
- ✅ Auto-fit columns and alternating row colors
- ✅ Download directly from API endpoint
- ✅ Send via Telegram Bot
- ✅ Send to external API with custom headers
- ✅ Admin-only access with JWT authentication
- ✅ Comprehensive error handling and logging

## 📦 Installation

The required dependencies are already included in your `package.json`:

```json
{
  "exceljs": "^4.4.0",
  "axios": "^1.x.x",
  "form-data": "^4.x.x"
}
```

If you need to install additional dependencies:

```bash
npm install axios form-data
```

## 🔌 API Endpoints

### 1. Export and Download Excel File

**Endpoint:** `GET /api/export/database`

**Description:** Exports all database tables to Excel and downloads the file directly.

**Authentication:** Required (Admin only)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/export/database" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  --output database_export.xlsx
```

**Response:** Binary Excel file (`.xlsx`)

**File Contents:**
- Summary worksheet with all collection statistics
- Users worksheet with all user data
- Categories worksheet
- Products worksheet (with populated category names)
- Sales worksheet (with populated seller and product info)
- Transfers worksheet
- SellerProducts worksheet
- SellerStock worksheet

---

### 2. Get Database Statistics

**Endpoint:** `GET /api/export/database/info`

**Description:** Get count of records in each collection before exporting.

**Authentication:** Required (Admin only)

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/export/database/info" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "collections": [
    { "name": "Users", "count": 45 },
    { "name": "Categories", "count": 12 },
    { "name": "Products", "count": 150 },
    { "name": "Sales", "count": 1250 },
    { "name": "Transfers", "count": 320 },
    { "name": "SellerProducts", "count": 180 },
    { "name": "SellerStock", "count": 95 }
  ],
  "totalRecords": 2052,
  "exportDate": "2024-01-15T10:30:00.000Z"
}
```

---

### 3. Send Export to External Destination

**Endpoint:** `POST /api/export/send`

**Description:** Generate Excel export and send it to an external destination (Telegram or external API).

**Authentication:** Required (Admin only)

#### 3a. Send via Telegram

**Request Body:**
```json
{
  "destination": "telegram",
  "telegramChatId": "123456789"
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:5000/api/export/send" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "telegram",
    "telegramChatId": "123456789"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Export sent via telegram",
  "stats": [
    { "name": "Users", "count": 45 },
    { "name": "Categories", "count": 12 },
    { "name": "Products", "count": 150 }
  ]
}
```

#### 3b. Send to External API

**Request Body:**
```json
{
  "destination": "api",
  "apiUrl": "https://your-api.com/upload",
  "apiHeaders": {
    "X-API-Key": "your-api-key",
    "X-Custom-Header": "custom-value"
  },
  "additionalFields": {
    "description": "Database export from Telegram Bot",
    "category": "backups",
    "userId": "admin123"
  }
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:5000/api/export/send" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "api",
    "apiUrl": "https://your-api.com/upload",
    "apiHeaders": {
      "X-API-Key": "your-secret-key"
    },
    "additionalFields": {
      "description": "Database backup",
      "type": "excel"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Export sent via api",
  "response": {
    "fileId": "abc123xyz",
    "url": "https://your-api.com/files/abc123xyz",
    "status": "uploaded"
  },
  "stats": [
    { "name": "Users", "count": 45 },
    { "name": "Categories", "count": 12 }
  ]
}
```

---

### 4. Custom Collection Export (Coming Soon)

**Endpoint:** `POST /api/export/custom`

**Description:** Export only selected collections/tables.

**Status:** 501 Not Implemented

---

## 🌐 Frontend Integration

### JavaScript/Fetch Example

#### Download Excel File

```javascript
async function downloadDatabaseExport() {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch('http://localhost:5000/api/export/database', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    // Create blob from response
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    
    console.log('Export downloaded successfully');
  } catch (error) {
    console.error('Download error:', error);
    alert('Failed to download export');
  }
}
```

#### Get Database Info

```javascript
async function getDatabaseInfo() {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch('http://localhost:5000/api/export/database/info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('Total records:', data.totalRecords);
    console.log('Collections:', data.collections);
    
    return data;
  } catch (error) {
    console.error('Error getting info:', error);
  }
}
```

#### Send via Telegram

```javascript
async function sendToTelegram(chatId) {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch('http://localhost:5000/api/export/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destination: 'telegram',
        telegramChatId: chatId
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Sent to Telegram successfully!');
      alert('Export sent to Telegram!');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Telegram send error:', error);
    alert('Failed to send to Telegram');
  }
}
```

### React Example

```jsx
import React, { useState } from 'react';
import axios from 'axios';

function ExportDatabaseButton() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const handleExport = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get(
        'http://localhost:5000/api/export/database',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `database_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      alert('Export downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export database');
    } finally {
      setLoading(false);
    }
  };

  const getStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get(
        'http://localhost:5000/api/export/database/info',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setStats(response.data);
    } catch (error) {
      console.error('Stats error:', error);
    }
  };

  return (
    <div>
      <button onClick={handleExport} disabled={loading}>
        {loading ? 'Exporting...' : 'Export Database'}
      </button>
      
      <button onClick={getStats}>
        Get Database Info
      </button>
      
      {stats && (
        <div>
          <h3>Database Statistics</h3>
          <p>Total Records: {stats.totalRecords}</p>
          <ul>
            {stats.collections.map(col => (
              <li key={col.name}>
                {col.name}: {col.count} records
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ExportDatabaseButton;
```

### Vue.js Example

```vue
<template>
  <div class="export-section">
    <button 
      @click="exportDatabase" 
      :disabled="loading"
      class="btn-export"
    >
      {{ loading ? 'Exporting...' : 'Export Database' }}
    </button>
    
    <button @click="getInfo" class="btn-info">
      Get Info
    </button>
    
    <div v-if="info" class="stats">
      <h3>Database Statistics</h3>
      <p>Total: {{ info.totalRecords }} records</p>
      <ul>
        <li v-for="col in info.collections" :key="col.name">
          {{ col.name }}: {{ col.count }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      loading: false,
      info: null
    };
  },
  methods: {
    async exportDatabase() {
      this.loading = true;
      
      try {
        const token = localStorage.getItem('authToken');
        
        const response = await axios.get(
          'http://localhost:5000/api/export/database',
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
          }
        );
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `export_${Date.now()}.xlsx`;
        link.click();
        
        this.$message.success('Export downloaded!');
      } catch (error) {
        console.error(error);
        this.$message.error('Export failed');
      } finally {
        this.loading = false;
      }
    },
    
    async getInfo() {
      try {
        const token = localStorage.getItem('authToken');
        
        const response = await axios.get(
          'http://localhost:5000/api/export/database/info',
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        this.info = response.data;
      } catch (error) {
        console.error(error);
      }
    }
  }
};
</script>
```

---

## 💻 Backend Usage

### Direct Function Calls

You can also use the export functions directly in your backend code:

```javascript
const { exportAllTablesToExcel } = require('./utils/excelExporter');
const { saveExcelToFile, sendExcelToAPI } = require('./utils/excelSender');

// Export to file
async function exportToFile() {
  const result = await saveExcelToFile('./exports/backup.xlsx');
  console.log('Saved:', result.path);
  console.log('Stats:', result.stats);
}

// Export and send to API
async function exportAndSend() {
  const result = await sendExcelToAPI('https://api.example.com/upload', {
    headers: {
      'X-API-Key': process.env.API_KEY
    },
    additionalFields: {
      source: 'telegram-bot',
      timestamp: Date.now()
    }
  });
  
  console.log('Upload response:', result.response);
}

// Generate workbook for custom processing
async function customExport() {
  const { workbook, stats } = await exportAllTablesToExcel();
  
  // Do custom processing
  const worksheet = workbook.getWorksheet('Users');
  // ... modify worksheet ...
  
  // Save
  await workbook.xlsx.writeFile('./custom_export.xlsx');
}
```

### Scheduled Exports

Use with node-cron for automatic backups:

```javascript
const cron = require('node-cron');
const { saveExcelToFile } = require('./utils/excelSender');

// Export every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled export...');
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `./backups/backup_${timestamp}.xlsx`;
  
  try {
    const result = await saveExcelToFile(filename);
    console.log('Backup completed:', result.stats);
  } catch (error) {
    console.error('Backup failed:', error);
  }
});
```

---

## ⚙️ Configuration

### Environment Variables

Add to your `.env` file:

```env
# Export Configuration
EXPORT_TEMP_DIR=./temp
EXPORT_MAX_FILE_SIZE=50000000
EXPORT_TIMEOUT=300000

# Telegram Bot (if using Telegram sending)
TELEGRAM_BOT_TOKEN=your_bot_token

# External API (if using API sending)
EXTERNAL_API_URL=https://your-api.com/upload
EXTERNAL_API_KEY=your_api_key
```

### Customize Export Models

Edit `utils/excelExporter.js` to customize which models to export:

```javascript
const modelsToExport = [
  {
    name: 'Users',
    model: User,
    populate: []
  },
  {
    name: 'CustomModel',
    model: CustomModel,
    populate: [
      { path: 'relatedField', select: 'name' }
    ]
  }
  // Add more models here...
];
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "Unauthorized" Error

**Problem:** Getting 401 status code.

**Solution:** 
- Ensure you're passing a valid JWT token in the Authorization header
- Check that the token hasn't expired
- Verify the user has admin role

```javascript
// Check token
const token = localStorage.getItem('authToken');
console.log('Token:', token ? 'Present' : 'Missing');
```

#### 2. "Forbidden" Error

**Problem:** Getting 403 status code.

**Solution:** 
- Only admin users can access export endpoints
- Check user role in database

```javascript
// Verify user role
const user = await User.findById(userId);
console.log('User role:', user.role);
```

#### 3. Large File Issues

**Problem:** Export fails or times out with large databases.

**Solution:**
- Increase timeout in fetch/axios
- Consider exporting specific collections instead of all
- Add pagination to export functions

```javascript
// Increase timeout
const response = await axios.get(url, {
  timeout: 300000 // 5 minutes
});
```

#### 4. Memory Issues

**Problem:** Server crashes during export.

**Solution:**
- Increase Node.js memory limit

```bash
node --max-old-space-size=4096 server.js
```

#### 5. Telegram Bot Not Working

**Problem:** Cannot send to Telegram.

**Solution:**
- Verify bot is properly initialized
- Check bot token in `.env`
- Ensure bot has permission to send files

```javascript
// Test bot
const bot = require('./bot/index');
console.log('Bot initialized:', !!bot);
```

---

## 📊 Excel File Structure

### Summary Worksheet

| Collection | Record Count | Export Date |
|------------|-------------|-------------|
| Users | 45 | 2024-01-15 10:30:00 |
| Products | 150 | 2024-01-15 10:30:00 |
| Sales | 1250 | 2024-01-15 10:30:00 |
| **TOTAL** | **1445** | |

### Data Worksheets

Each collection gets its own worksheet with:
- **Headers:** Bold, white text on blue background
- **Auto-fit columns:** Adjusts to content width
- **Alternating rows:** White and light gray for readability
- **Filters:** Auto-filter enabled on all columns
- **Populated references:** Shows names instead of ObjectIds

---

## 🔐 Security Considerations

1. **Authentication Required:** All endpoints require valid JWT token
2. **Admin Only:** Only users with admin role can export data
3. **Rate Limiting:** Consider adding rate limiting for export endpoints
4. **File Cleanup:** Temporary files are automatically deleted after use
5. **Data Sanitization:** All data is formatted and sanitized before export

---

## 📝 License

This export functionality is part of the Telegram Hisobchi Bot project.

---

## 🤝 Support

For issues or questions:
1. Check this documentation
2. Review the code in `utils/excelExporter.js` and `routes/export.js`
3. Check server logs for detailed error messages
4. Contact the development team

---

## 🚀 Future Enhancements

- [ ] Custom collection selection
- [ ] Email sending functionality
- [ ] Scheduled automatic exports
- [ ] CSV format support
- [ ] PDF export option
- [ ] Data filtering before export
- [ ] Compression for large files
- [ ] Export history tracking
- [ ] Progress indicators for large exports

---

**Last Updated:** 2024
**Version:** 1.0.0