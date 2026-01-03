# Telegram Hisobchi Bot API Documentation

## Overview

This is the backend API for the Telegram Hisobchi Bot - a comprehensive sales management system that allows administrators to manage products, sellers, and track sales analytics.

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Configure your environment variables
```

4. Start the server:

**Development mode (without Telegram bot):**
```bash
npm run dev
# or on Windows
npm run dev:win
```

**Production mode (with Telegram bot):**
```bash
npm run start
# or on Windows
npm run start:win
```

## 📖 API Documentation

### Interactive Documentation

Once the server is running, you can access the interactive Swagger documentation at:

**🔗 [http://localhost:5000/api-docs](http://localhost:5000/api-docs)**

### JSON Schema

Raw OpenAPI JSON schema is available at:
**🔗 [http://localhost:5000/api-docs.json](http://localhost:5000/api-docs.json)**

## 🔐 Authentication

The API uses **Telegram-based authentication** for all endpoints:

**Required Headers:**
- `x-telegram-id`: Telegram user ID (REQUIRED for all authenticated endpoints)

**How it works:**
1. All authenticated endpoints require ONLY the `x-telegram-id` header
2. Users must be registered in the system (sellers are created by admins, admin is auto-created)
3. The system automatically handles user creation and updates based on the Telegram ID

## 📋 API Endpoints Summary

### Health Check
- `GET /api/health` - Check API status

### Authentication (`/api/auth`)
- `GET /api/auth/me` - Get current user info
- `PUT /api/auth/me` - Update user profile

### Products (`/api/products`) - Admin Only
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Categories (`/api/categories`)
- `GET /api/categories` - Get all categories (All authenticated users)
- `POST /api/categories` - Create new category (Admin only)
- `PUT /api/categories/:id` - Update category (Admin only)
- `DELETE /api/categories/:id` - Delete category (Admin only)

### Sales (`/api/sales`)
- `POST /api/sales` - Create new sale
- `GET /api/sales` - Get sales (filtered by role)
- `GET /api/sales/:id` - Get single sale

### Seller Routes (`/api/sellerId`) - Seller Only
- `GET /api/sellerId/products` - Get assigned products
- `GET /api/sellerId/sales` - Get seller's sales
- `GET /api/sellerId/reports` - Get seller's reports

### Admin - Seller Management (`/api/admin`) - Admin Only
- `GET /api/admin/sellers` - Get all sellers
- `POST /api/admin/sellers` - Create new seller
- `PUT /api/admin/sellers/:id` - Update seller
- `DELETE /api/admin/sellers/:id` - Delete seller

### Admin - Product Assignment (`/api/admin`) - Admin Only
- `POST /api/admin/sellers/:sellerId/products/:productId` - Assign product to seller
- `DELETE /api/admin/sellers/:sellerId/products/:productId` - Unassign product

### Admin - Reports (`/api/admin`) - Admin Only
- `GET /api/admin/reports/monthly` - Get monthly reports

### Analytics (`/api/analytics`) - Admin Only
- `GET /api/analytics` - Get inventory analytics

### Transfers (`/api/transfers`) - Admin Only
- `GET /api/transfers` - Get transfer history
- `POST /api/transfers` - Create bulk transfers
- `PUT /api/transfers/:id` - Update transfer
- `POST /api/transfers/:id/return` - Return products to warehouse

## 🏗️ Architecture

### User Roles
- **Admin**: Full access to all endpoints, can manage sellers and products
- **Seller**: Limited access to assigned products and own sales

### Key Features
- **Stock Management**: Real-time inventory tracking
- **Multi-level Stock**: Warehouse stock + individual seller stock
- **Sales Tracking**: Complete sales history with customer information
- **Transfer System**: Product transfers between warehouse and sellers
- **Analytics**: Comprehensive reporting and analytics
- **Role-based Access**: Secure role-based permissions

### Database Models
- **User**: Admin and seller accounts
- **Product**: Product catalog with stock management
- **Category**: Product categories for organization
- **Sale**: Sales transactions
- **Transfer**: Stock transfer records

## 🛠️ Environment Variables

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGO_URI=mongodb://localhost:27017/telegram-hisobchi-bot

# JWT Configuration (if using JWT auth)
JWT_SECRET=your_super_secret_jwt_key_here

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Telegram Bot Configuration (Production only)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Admin Configuration
ADMIN_ID=your_telegram_admin_id_here

# API Configuration
API_BASE_URL=http://localhost:5000
```

## 📱 Environment Profiles

### 🔧 Development Mode
- **Command**: `npm run dev` or `npm run dev:win`
- **Environment**: `NODE_ENV=development`
- **Telegram Bot**: **DISABLED** (for faster development)
- **Features**: Full API functionality without bot integration

### 🚀 Production Mode
- **Command**: `npm run start` or `npm run start:win`
- **Environment**: `NODE_ENV=production`
- **Telegram Bot**: **ENABLED** (full bot integration)
- **Features**: Complete system with bot functionality

## 📱 Integration with Telegram

This API is designed to work with Telegram Web Apps and includes:
- Telegram user authentication
- Integration with Telegram Bot API (production only)
- Support for Telegram-specific headers

## 🛠️ Development

### Available Scripts

```bash
# Development (no Telegram bot)
npm run dev          # Linux/Mac
npm run dev:win      # Windows

# Production (with Telegram bot)
npm run start        # Linux/Mac
npm run start:win    # Windows
npm run prod         # Linux/Mac (alternative)
npm run prod:win     # Windows (alternative)

# Database Scripts
npm run refresh-indices  # Refresh database indexes
```

### Environment Setup

1. Copy environment file:
```bash
cp .env.example .env
```

2. Configure your variables in `.env`

3. For development (recommended):
```bash
NODE_ENV=development
```

4. For production:
```bash
NODE_ENV=production
TELEGRAM_BOT_TOKEN=your_actual_bot_token
ADMIN_ID=your_telegram_admin_id
```

### Code Structure
```
├── routes/          # API route handlers
├── models/          # Database models
├── middleware/      # Authentication & validation middleware
├── swagger/         # API documentation configuration
├── utils/           # Utility functions
├── config/          # Configuration files
└── scripts/         # Database scripts
```

## 📊 Response Format

All API responses follow this format:

### Success Response
```json
{
  "data": {}, // Response data
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": "Error message",
  "stack": "Error stack trace (development only)"
}
```

## 🚨 Error Codes

- `400` - Bad Request (validation errors, insufficient stock)
- `401` - Unauthorized (invalid or missing authentication)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error

## 🔍 Query Parameters

Many endpoints support filtering and pagination:

### Date Filtering
```
GET /api/sales?startDate=2024-01-01&endDate=2024-01-31
```

### Pagination (where supported)
```
GET /api/endpoint?page=1&limit=20
```

## 📈 Monitoring

### Health Check
Use the health endpoint to monitor API status:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "OK"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🔑 Authentication Details

### Required Headers for ALL authenticated endpoints:

```bash
# Required header (ONLY this one!)
x-telegram-id: 123456789
```

### Example API Call:

```bash
curl -X GET "http://localhost:5000/api/auth/me" \
  -H "x-telegram-id: 123456789" \
  -H "Content-Type: application/json"
```

### User Registration Flow:

1. **Admin Users**: Auto-created when first accessing with ADMIN_ID from environment
2. **Seller Users**: Must be created by admin through `/api/admin/sellers` endpoint
3. **Authentication**: All subsequent requests require ONLY the `x-telegram-id` header

## 📄 License

This project is licensed under the ISC License.

---

For detailed endpoint documentation with request/response examples, please visit the **[Interactive API Documentation](http://localhost:5000/api-docs)**.