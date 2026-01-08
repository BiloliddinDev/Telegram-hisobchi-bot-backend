# Quick Start Guide - Database Export

Get started with exporting your database in 5 minutes!

## 🚀 Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Ensure your server is running:**
```bash
npm run dev
# or
npm run dev:win
```

## 📥 Quick Usage

### 1. Download Excel File (Easiest Method)

**Using cURL:**
```bash
curl -X GET "http://localhost:5000/api/export/database" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  --output database_export.xlsx
```

**Using Browser:**
1. Login to your admin account
2. Navigate to: `http://localhost:5000/api/export/database`
3. File will download automatically

### 2. Check Database Statistics First

```bash
curl -X GET "http://localhost:5000/api/export/database/info" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "collections": [
    { "name": "Users", "count": 45 },
    { "name": "Products", "count": 150 },
    { "name": "Sales", "count": 1250 }
  ],
  "totalRecords": 2052
}
```

### 3. Send to Telegram

```bash
curl -X POST "http://localhost:5000/api/export/send" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "telegram",
    "telegramChatId": "YOUR_CHAT_ID"
  }'
```

## 🔑 Getting Your Auth Token

### Method 1: Login via API
```bash
curl -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_password"
  }'
```

Copy the `token` from the response.

### Method 2: From Browser Console
1. Login to your web app
2. Open browser console (F12)
3. Type: `localStorage.getItem('authToken')`

## 📱 Frontend Integration

### Simple HTML Button

```html
<!DOCTYPE html>
<html>
<head>
    <title>Database Export</title>
</head>
<body>
    <button onclick="exportDatabase()">Export Database</button>
    
    <script>
        async function exportDatabase() {
            const token = 'YOUR_AUTH_TOKEN'; // Get from localStorage
            
            try {
                const response = await fetch('http://localhost:5000/api/export/database', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'database_export.xlsx';
                a.click();
                
                alert('Export downloaded!');
            } catch (error) {
                alert('Export failed: ' + error.message);
            }
        }
    </script>
</body>
</html>
```

### React Component

```jsx
import React, { useState } from 'react';

function ExportButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    const token = localStorage.getItem('authToken');
    
    try {
      const response = await fetch('http://localhost:5000/api/export/database', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${Date.now()}.xlsx`;
      a.click();
      
      alert('Export downloaded successfully!');
    } catch (error) {
      alert('Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleExport} disabled={loading}>
      {loading ? 'Exporting...' : 'Export Database'}
    </button>
  );
}

export default ExportButton;
```

## 🎯 What You Get

The exported Excel file contains:

1. **Summary Sheet** - Overview with record counts
2. **Users Sheet** - All user data
3. **Categories Sheet** - Product categories
4. **Products Sheet** - All products with category names
5. **Sales Sheet** - Sales records with seller and product info
6. **Transfers Sheet** - Transfer history
7. **SellerProducts Sheet** - Seller-product relationships
8. **SellerStock Sheet** - Stock information

### Features:
- ✅ Professional formatting with colors
- ✅ Auto-sized columns
- ✅ Filterable headers
- ✅ Human-readable references (names instead of IDs)
- ✅ Date formatting

## 🔒 Security

**Important:** Only admin users can export data!

To check your role:
```javascript
// In your backend
const user = await User.findById(userId);
console.log('Role:', user.role); // Should be 'admin'
```

## 🐛 Troubleshooting

### Problem: 401 Unauthorized
**Solution:** Your token is invalid or expired. Get a new one by logging in.

### Problem: 403 Forbidden
**Solution:** Your user doesn't have admin role. Check database:
```javascript
db.users.updateOne(
  { username: "your_username" },
  { $set: { role: "admin" } }
)
```

### Problem: Export takes too long
**Solution:** Your database is large. The export is still processing. Wait or check server logs.

### Problem: Can't send to Telegram
**Solution:** Make sure your bot is properly configured in the project.

## 📊 Backend Usage

### Export to File Programmatically

```javascript
const { saveExcelToFile } = require('./utils/excelSender');

async function backup() {
  const result = await saveExcelToFile('./backups/backup.xlsx');
  console.log('Backup saved:', result.path);
  console.log('Records exported:', result.stats);
}

backup();
```

### Send to External API

```javascript
const { sendExcelToAPI } = require('./utils/excelSender');

async function sendToAPI() {
  const result = await sendExcelToAPI('https://api.example.com/upload', {
    headers: {
      'X-API-Key': 'your_api_key'
    },
    additionalFields: {
      description: 'Daily backup',
      timestamp: Date.now()
    }
  });
  
  console.log('Upload successful:', result.response);
}
```

## 🔄 Automated Backups

Create a scheduled backup with node-cron:

```javascript
const cron = require('node-cron');
const { saveExcelToFile } = require('./utils/excelSender');

// Run every day at 3 AM
cron.schedule('0 3 * * *', async () => {
  console.log('Running daily backup...');
  
  const date = new Date().toISOString().split('T')[0];
  const filename = `./backups/backup_${date}.xlsx`;
  
  try {
    await saveExcelToFile(filename);
    console.log('Backup completed successfully');
  } catch (error) {
    console.error('Backup failed:', error);
  }
});
```

## 📚 Next Steps

1. Read the full documentation: [EXPORT_DOCUMENTATION.md](./EXPORT_DOCUMENTATION.md)
2. Test the API with Postman or Insomnia
3. Integrate into your frontend application
4. Set up automated backups (optional)

## 🆘 Need Help?

- Check server logs for detailed error messages
- Review the [full documentation](./EXPORT_DOCUMENTATION.md)
- Inspect network requests in browser DevTools
- Verify your authentication token is valid

---

**Happy Exporting! 🎉**