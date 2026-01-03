/**
 * @swagger
 * /api/health:
 *   get:
 *     tags:
 *       - Health Check
 *     summary: Check API health status
 *     description: Returns the current status of the API
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user information
 *     description: Returns the authenticated user's profile with assigned products
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     tags:
 *       - Authentication
 *     summary: Update current user information
 *     description: Updates the authenticated user's profile information
 *     security:
 *       - TelegramAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username
 *               firstName:
 *                 type: string
 *                 description: First name
 *               lastName:
 *                 type: string
 *                 description: Last name
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get all products (Admin only)
 *     description: Returns all products with assigned sellers information
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       403:
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     tags:
 *       - Products
 *     summary: Create new product (Admin only)
 *     description: Creates a new product in the system
 *     security:
 *       - TelegramAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - costPrice
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *                 description: Product name
 *               description:
 *                 type: string
 *                 description: Product description
 *               price:
 *                 type: number
 *                 description: Selling price
 *               costPrice:
 *                 type: number
 *                 description: Cost price
 *               category:
 *                 type: string
 *                 description: Product category
 *               stock:
 *                 type: number
 *                 description: Initial stock quantity
 *               image:
 *                 type: string
 *                 description: Product image URL
 *               sku:
 *                 type: string
 *                 description: Stock Keeping Unit
 *               color:
 *                 type: string
 *                 description: Product color
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get single product
 *     description: Returns detailed information about a specific product
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     tags:
 *       - Products
 *     summary: Update product (Admin only)
 *     description: Updates an existing product
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               costPrice:
 *                 type: number
 *               category:
 *                 type: string
 *               stock:
 *                 type: number
 *               image:
 *                 type: string
 *               sku:
 *                 type: string
 *               color:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags:
 *       - Products
 *     summary: Delete product (Admin only)
 *     description: Deletes a product from the system
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/sales:
 *   post:
 *     tags:
 *       - Sales
 *     summary: Create new sale
 *     description: Records a new sale and updates inventory
 *     security:
 *       - TelegramAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *               - price
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID being sold
 *               quantity:
 *                 type: number
 *                 description: Quantity being sold
 *               price:
 *                 type: number
 *                 description: Price per unit
 *               customerName:
 *                 type: string
 *                 description: Customer name
 *               customerPhone:
 *                 type: string
 *                 description: Customer phone number
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       201:
 *         description: Sale created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sale:
 *                   $ref: '#/components/schemas/Sale'
 *       400:
 *         description: Insufficient stock or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied - Product not assigned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     tags:
 *       - Sales
 *     summary: Get sales
 *     description: Returns sales data (Admin sees all, Sellers see only their own)
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Sales retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sales:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 */

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     tags:
 *       - Sales
 *     summary: Get single sale
 *     description: Returns detailed information about a specific sale
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sale ID
 *     responses:
 *       200:
 *         description: Sale retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sale:
 *                   $ref: '#/components/schemas/Sale'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Sale not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/seller/products:
 *   get:
 *     tags:
 *       - Seller
 *     summary: Get seller's assigned products
 *     description: Returns products assigned to the authenticated seller
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */

/**
 * @swagger
 * /api/seller/sales:
 *   get:
 *     tags:
 *       - Seller
 *     summary: Get seller's sales
 *     description: Returns sales made by the authenticated seller
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Sales retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sales:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 */

/**
 * @swagger
 * /api/seller/reports:
 *   get:
 *     tags:
 *       - Seller
 *     summary: Get seller's reports
 *     description: Returns monthly sales reports for the authenticated seller
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year for the report
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Month for the report (1-12)
 *     responses:
 *       200:
 *         description: Report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalSales:
 *                       type: number
 *                     totalRevenue:
 *                       type: number
 *                     totalQuantity:
 *                       type: number
 *                 sales:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 */

/**
 * @swagger
 * /api/admin/sellers:
 *   get:
 *     tags:
 *       - Admin - Sellers
 *     summary: Get all sellers (Admin only)
 *     description: Returns all sellers with their assigned products
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
 *   post:
 *     tags:
 *       - Admin - Sellers
 *     summary: Create new seller (Admin only)
 *     description: Creates a new seller account
 *     security:
 *       - TelegramAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - phoneNumber
 *             properties:
 *               telegramId:
 *                 type: string
 *                 description: Telegram user ID
 *               username:
 *                 type: string
 *                 description: Username
 *               firstName:
 *                 type: string
 *                 description: First name
 *               lastName:
 *                 type: string
 *                 description: Last name
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number
 *     responses:
 *       201:
 *         description: Seller created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 seller:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Phone number already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/admin/sellers/{id}:
 *   put:
 *     tags:
 *       - Admin - Sellers
 *     summary: Update seller (Admin only)
 *     description: Updates seller information
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Seller ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Seller updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 seller:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: Seller not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags:
 *       - Admin - Sellers
 *     summary: Delete seller (Admin only)
 *     description: Deletes a seller account
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Seller ID
 *     responses:
 *       200:
 *         description: Seller deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Seller not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/admin/sellers/{sellerId}/products/{productId}:
 *   post:
 *     tags:
 *       - Admin - Product Assignment
 *     summary: Assign product to seller (Admin only)
 *     description: Assigns a product to a seller and transfers stock
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *                 description: Quantity to transfer to seller
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
 *     summary: Unassign product from seller (Admin only)
 *     description: Removes product assignment from seller
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
 *     responses:
 *       200:
 *         description: Product unassigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Seller or product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/admin/reports/monthly:
 *   get:
 *     tags:
 *       - Admin - Reports
 *     summary: Get monthly reports (Admin only)
 *     description: Returns comprehensive monthly sales reports with analytics
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year for the report
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Month for the report (1-12)
 *     responses:
 *       200:
 *         description: Enhanced monthly report with comprehensive analytics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MonthlyReport'
 */

/**
 * @swagger
 * /api/analytics:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get analytics data (Admin only)
 *     description: Returns inventory analytics and stock distribution
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
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
 *                       description: Total inventory value
 *                     warehouseStockValue:
 *                       type: number
 *                       description: Warehouse stock value
 *                     sellerStockValue:
 *                       type: number
 *                       description: Total value of stock with sellers
 *                 sellers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       telegramId:
 *                         type: string
 *                       totalValue:
 *                         type: number
 *                       productCount:
 *                         type: number
 *                 sales:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 */

/**
 * @swagger
 * /api/transfers:
 *   get:
 *     tags:
 *       - Transfers
 *     summary: Get transfer history (Admin only)
 *     description: Returns all transfer records
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
 *       - Transfers
 *     summary: Create bulk transfers (Admin only)
 *     description: Creates multiple product transfers to a seller
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
 *                 description: Seller ID to transfer products to
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: Product ID
 *                     quantity:
 *                       type: number
 *                       description: Quantity to transfer
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
 *                 transfers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transfer'
 *       400:
 *         description: Insufficient stock or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Seller not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/transfers/{id}:
 *   put:
 *     tags:
 *       - Transfers
 *     summary: Update transfer (Admin only)
 *     description: Updates transfer quantity and adjusts stock accordingly
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transfer ID
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
 *                 description: New quantity for the transfer
 *     responses:
 *       200:
 *         description: Transfer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 transfer:
 *                   $ref: '#/components/schemas/Transfer'
 *       400:
 *         description: Validation error or insufficient stock
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Transfer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/transfers/{id}/return:
 *   post:
 *     tags:
 *       - Transfers
 *     summary: Return products to warehouse (Admin only)
 *     description: Returns products from seller back to warehouse stock
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transfer ID to return
 *     responses:
 *       200:
 *         description: Products returned to warehouse successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Mahsulot omborga qaytarildi"
 *       400:
 *         description: Cannot return transfer (already returned, cancelled, or insufficient seller stock)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Transfer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags:
 *       - Categories
 *     summary: Get all categories
 *     description: Returns all product categories sorted alphabetically
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     tags:
 *       - Categories
 *     summary: Create new category (Admin only)
 *     description: Creates a new product category
 *     security:
 *       - TelegramAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Category name
 *                 example: "Electronics"
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Category name is required or category already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     tags:
 *       - Categories
 *     summary: Update category (Admin only)
 *     description: Updates an existing category name
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: New category name
 *                 example: "Updated Electronics"
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Category name is required or category already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags:
 *       - Categories
 *     summary: Delete category (Admin only)
 *     description: Deletes a category from the system
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Category deleted successfully"
 *       403:
 *         description: Access denied - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
