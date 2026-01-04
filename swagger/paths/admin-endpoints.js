/**
 * @swagger
 * /api/admin/sellers:
 *   get:
 *     tags:
 *       - Admin - User Management
 *     summary: Get all sellers
 *     description: Returns a list of all sellers in the system
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Sellers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sellers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/sellers/{sellerId}/products/{productId}:
 *   post:
 *     tags:
 *       - Admin - Product Assignment
 *     summary: Assign product to seller
 *     description: Assigns a product to a seller with optional quantity transfer
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Seller ID
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *                 minimum: 0
 *                 description: Quantity to transfer (0 for permission only)
 *                 example: 10
 *     responses:
 *       200:
 *         description: Product assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product assigned successfully"
 *                 seller:
 *                   $ref: '#/components/schemas/User'
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Insufficient warehouse stock
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Seller or product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags:
 *       - Admin - Product Assignment
 *     summary: Unassign product from seller
 *     description: Removes product assignment from seller with stock handling
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Seller ID
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: returnStock
 *         schema:
 *           type: boolean
 *         description: Whether to return seller's stock to warehouse
 *         example: true
 *     responses:
 *       200:
 *         description: Product unassigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product unassigned successfully"
 *                 stockReturned:
 *                   type: number
 *                   description: Amount of stock returned to warehouse
 *                   example: 15
 *       400:
 *         description: Seller has stock, use returnStock=true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Cannot unassign. Seller has 15 units in stock. Return stock first or use ?returnStock=true"
 *                 currentStock:
 *                   type: number
 *                   example: 15
 *                 suggestion:
 *                   type: string
 *                   example: "Use: DELETE /admin/sellers/12345/products/67890?returnStock=true"
 *       404:
 *         description: Seller or product not found
 */

/**
 * @swagger
 * /api/admin/seller-stocks:
 *   get:
 *     tags:
 *       - Admin - Stock Management
 *     summary: Get all seller stocks
 *     description: Returns a list of all seller stock records with populated seller and product information
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Seller stocks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sellerStocks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SellerStock'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/admin/seller-stocks/{stockId}:
 *   patch:
 *     tags:
 *       - Admin - Stock Management
 *     summary: Update seller stock quantity
 *     description: Updates seller stock quantity with automatic warehouse adjustment and audit trail creation
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: stockId
 *         required: true
 *         schema:
 *           type: string
 *         description: SellerStock ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *                 minimum: 0
 *                 description: New stock quantity
 *                 example: 25
 *     responses:
 *       200:
 *         description: Stock quantity updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Stock quantity updated successfully"
 *                 sellerStock:
 *                   $ref: '#/components/schemas/SellerStock'
 *                 change:
 *                   type: number
 *                   description: Quantity change (positive = increase, negative = decrease)
 *                   example: 5
 *                 warehouseStockAfter:
 *                   type: number
 *                   description: Warehouse stock after adjustment
 *                   example: 45
 *                 transferCreated:
 *                   type: boolean
 *                   description: Whether a transfer record was created
 *                   example: true
 *       400:
 *         description: Invalid quantity or insufficient warehouse stock
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Cannot increase stock by 10. Warehouse only has 5 units available."
 *                 warehouseStock:
 *                   type: number
 *                   example: 5
 *                 requestedIncrease:
 *                   type: number
 *                   example: 10
 *       404:
 *         description: SellerStock not found
 *   delete:
 *     tags:
 *       - Admin - Stock Management
 *     summary: Delete seller stock
 *     description: Removes seller stock record and returns all quantity to warehouse with transfer record creation
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: stockId
 *         required: true
 *         schema:
 *           type: string
 *         description: SellerStock ID
 *     responses:
 *       200:
 *         description: Seller stock removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Seller stock removed successfully"
 *                 returnedToWarehouse:
 *                   type: number
 *                   description: Quantity returned to warehouse
 *                   example: 20
 *                 sellerStock:
 *                   $ref: '#/components/schemas/SellerStock'
 *       404:
 *         description: SellerStock not found
 */

/**
 * @swagger
 * /api/admin/sellers/{sellerId}/stocks:
 *   get:
 *     tags:
 *       - Admin - Stock Management
 *     summary: Get stocks for specific seller
 *     description: Returns all stock records for a specific seller with product information
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Seller ID
 *     responses:
 *       200:
 *         description: Seller stocks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sellerStocks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SellerStock'
 *                 message:
 *                   type: string
 *                   description: Message if no stocks found
 *                   example: "No stocks found for this seller"
 */

/**
 * @swagger
 * /api/admin/products/{productId}/stocks:
 *   get:
 *     tags:
 *       - Admin - Stock Management
 *     summary: Get stocks for specific product
 *     description: Returns all seller stock records for a specific product
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product stocks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 productStocks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SellerStock'
 *                 message:
 *                   type: string
 *                   description: Message if no stocks found
 *                   example: "No stocks found for this product"
 */

/**
 * @swagger
 * /api/admin/transfers:
 *   get:
 *     tags:
 *       - Admin - Transfer Management
 *     summary: Get transfer history
 *     description: Returns all transfer records sorted by creation date (newest first)
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Transfers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transfers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transfer'
 *   post:
 *     tags:
 *       - Admin - Transfer Management
 *     summary: Create new transfer(s)
 *     description: Creates new inventory transfers from warehouse to seller (supports bulk transfers)
 *     security:
 *       - TelegramAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sellerId
 *               - items
 *             properties:
 *               sellerId:
 *                 type: string
 *                 description: Target seller ID
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *               items:
 *                 type: array
 *                 description: List of products to transfer
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: Product ID
 *                       example: "64f1a2b3c4d5e6f7g8h9i0j2"
 *                     quantity:
 *                       type: number
 *                       minimum: 1
 *                       description: Quantity to transfer
 *                       example: 15
 *           example:
 *             sellerId: "64f1a2b3c4d5e6f7g8h9i0j1"
 *             items:
 *               - productId: "64f1a2b3c4d5e6f7g8h9i0j2"
 *                 quantity: 15
 *               - productId: "64f1a2b3c4d5e6f7g8h9i0j3"
 *                 quantity: 8
 *     responses:
 *       201:
 *         description: Transfers created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Muvaffaqiyatli biriktirildi"
 *                 transfers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transfer'
 *       400:
 *         description: Validation error or insufficient warehouse stock
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Omborda yetarli mahsulot yo'q: iPhone 15"
 *       404:
 *         description: Seller or product not found
 */

/**
 * @swagger
 * /api/admin/transfers/{id}/return:
 *   post:
 *     tags:
 *       - Admin - Transfer Management
 *     summary: Return transfer to warehouse
 *     description: Returns products from seller back to warehouse (supports partial returns)
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Original transfer ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *                 description: Quantity to return (optional, defaults to full return)
 *                 example: 10
 *     responses:
 *       200:
 *         description: Products returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Stock returned to warehouse"
 *                 originalTransfer:
 *                   $ref: '#/components/schemas/Transfer'
 *                 returnTransfer:
 *                   $ref: '#/components/schemas/Transfer'
 *                 returnedQuantity:
 *                   type: number
 *                   description: Quantity returned
 *                   example: 10
 *       400:
 *         description: Invalid return request or insufficient seller stock
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Seller doesn't have enough stock to return"
 *       404:
 *         description: Transfer not found
 */

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     tags:
 *       - Admin - Analytics
 *     summary: Get inventory analytics
 *     description: Returns comprehensive inventory and sales analytics including stock distribution and values
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalInventoryValue:
 *                       type: number
 *                       description: Total value of all inventory
 *                       example: 125000
 *                     warehouseStockValue:
 *                       type: number
 *                       description: Value of warehouse stock
 *                       example: 75000
 *                     sellerStockValue:
 *                       type: number
 *                       description: Total value of stock with sellers
 *                       example: 50000
 *                 sellers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Seller ID
 *                       username:
 *                         type: string
 *                         description: Seller username
 *                       firstName:
 *                         type: string
 *                         description: Seller first name
 *                       lastName:
 *                         type: string
 *                         description: Seller last name
 *                       telegramId:
 *                         type: string
 *                         description: Telegram ID
 *                       totalValue:
 *                         type: number
 *                         description: Total stock value with this seller
 *                       productCount:
 *                         type: number
 *                         description: Total product count with this seller
 *                 sales:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 */

/**
 * @swagger
 * /api/admin/reports/monthly:
 *   get:
 *     tags:
 *       - Admin - Reports
 *     summary: Get comprehensive monthly report
 *     description: Returns detailed monthly sales report with analytics, seller performance, and product insights
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: number
 *         description: Report year (defaults to current year)
 *         example: 2024
 *       - in: query
 *         name: month
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 12
 *         description: Report month (defaults to current month)
 *         example: 12
 *     responses:
 *       200:
 *         description: Monthly report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MonthlyReport'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
