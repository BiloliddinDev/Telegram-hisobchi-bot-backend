/**
 * @swagger
 * /api/seller/stocks:
 *   get:
 *     tags:
 *       - Seller - Stock Management
 *     summary: Get seller's stock inventory
 *     description: Returns current seller's stock with summary statistics including total products, quantities, and values
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Stock inventory retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stocks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SellerStock'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalProducts:
 *                       type: number
 *                       description: Number of different products
 *                       example: 5
 *                     totalQuantity:
 *                       type: number
 *                       description: Total quantity of all products
 *                       example: 150
 *                     totalStockValue:
 *                       type: number
 *                       description: Total value of seller's stock
 *                       example: 45000
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Seller access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/seller/stocks/product/{productId}:
 *   get:
 *     tags:
 *       - Seller - Stock Management
 *     summary: Get stock for specific product
 *     description: Returns seller's stock information for a specific product with detailed product information
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     responses:
 *       200:
 *         description: Stock information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stock:
 *                   $ref: '#/components/schemas/SellerStock'
 *       404:
 *         description: Stock not found for this product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Stock not found for this product"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Seller access required
 */

/**
 * @swagger
 * /api/seller/products:
 *   get:
 *     tags:
 *       - Seller - Product Management
 *     summary: Get seller's assigned products
 *     description: Returns products assigned to the current seller for selling
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Assigned products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Seller access required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/seller/sales:
 *   get:
 *     tags:
 *       - Seller - Sales Management
 *     summary: Get seller's sales history
 *     description: Returns sales history for the current seller with optional date filtering
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (YYYY-MM-DD)
 *         example: "2024-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (YYYY-MM-DD)
 *         example: "2024-12-31"
 *     responses:
 *       200:
 *         description: Sales history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sales:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Seller access required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/seller/reports:
 *   get:
 *     tags:
 *       - Seller - Reports
 *     summary: Get seller's monthly report
 *     description: Returns monthly sales report for the current seller with summary statistics and detailed sales data
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
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       description: Report period start
 *                       example: "2024-12-01T00:00:00.000Z"
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       description: Report period end
 *                       example: "2024-12-31T23:59:59.999Z"
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalSales:
 *                       type: number
 *                       description: Total number of sales
 *                       example: 45
 *                     totalRevenue:
 *                       type: number
 *                       description: Total revenue amount
 *                       example: 125000
 *                     totalQuantity:
 *                       type: number
 *                       description: Total quantity sold
 *                       example: 300
 *                 sales:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 *                   description: Detailed sales data for the period
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Seller access required
 *       500:
 *         description: Server error
 */
