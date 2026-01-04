/**
 * @swagger
 * /api/analytics:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get analytics data (Admin only)
 *     description: Returns comprehensive analytics including inventory values, seller distribution, and sales data
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
 *                       description: Total value of all inventory (warehouse + sellers)
 *                       example: 50000000
 *                     warehouseStockValue:
 *                       type: number
 *                       description: Total value of warehouse stock
 *                       example: 30000000
 *                     sellerStockValue:
 *                       type: number
 *                       description: Total value of stock with sellers
 *                       example: 20000000
 *                 sellers:
 *                   type: array
 *                   description: Distribution of inventory across sellers
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
 *                         description: Total value of products with this seller
 *                       productCount:
 *                         type: number
 *                         description: Total quantity of products with this seller
 *                 sales:
 *                   type: array
 *                   description: Recent sales data
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/reports:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Get sales reports
 *     description: Returns sales reports for a specified period. Sellers can only see their own reports, admins can see all reports or filter by seller.
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year for the report (defaults to current year)
 *         example: 2024
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Month for the report (1-12, defaults to current month)
 *         example: 3
 *       - in: query
 *         name: sellerId
 *         schema:
 *           type: string
 *         description: Filter by seller ID (admin only)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Report retrieved successfully
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
 *                       description: Start date of the report period
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       description: End date of the report period
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalSales:
 *                       type: number
 *                       description: Total number of sales
 *                       example: 150
 *                     totalRevenue:
 *                       type: number
 *                       description: Total revenue generated
 *                       example: 15000000
 *                     totalQuantity:
 *                       type: number
 *                       description: Total quantity of items sold
 *                       example: 300
 *                 sales:
 *                   type: array
 *                   description: List of sales in the period
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */

module.exports = {};
