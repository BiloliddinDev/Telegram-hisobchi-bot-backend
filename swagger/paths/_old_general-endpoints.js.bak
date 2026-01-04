/**
 * @swagger
 * /api/health:
 *   get:
 *     tags:
 *       - Health Check
 *     summary: Check API health status
 *     description: Returns the current status of the API server
 *     responses:
 *       200:
 *         description: API is healthy and running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-12-01T10:00:00.000Z"
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user information
 *     description: Returns the authenticated user's profile with assigned products and role information
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
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Authentication required"
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
 *     summary: Get all active products
 *     description: Returns a list of all active products available in the system
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
 *       401:
 *         description: Authentication required
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
 * /api/sales:
 *   post:
 *     tags:
 *       - Sales
 *     summary: Create a new sale
 *     description: Creates a new sale record and updates inventory. Sellers can only sell assigned products from their stock.
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
 *                 description: Product ID to sell
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *                 description: Quantity to sell
 *                 example: 3
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Price per unit
 *                 example: 25000
 *               customerName:
 *                 type: string
 *                 description: Customer name (optional)
 *                 example: "John Doe"
 *               customerPhone:
 *                 type: string
 *                 description: Customer phone number (optional)
 *                 example: "+998901234567"
 *               notes:
 *                 type: string
 *                 description: Additional notes (optional)
 *                 example: "Customer requested express delivery"
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
 *                 message:
 *                   type: string
 *                   example: "Sale created successfully"
 *       400:
 *         description: Validation error or insufficient stock
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Sizda yetarli mahsulot yo'q"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Product not assigned to seller
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "You do not have access to this product"
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     tags:
 *       - Sales
 *     summary: Get sales history
 *     description: Returns sales history for the authenticated user with optional date filtering
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
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags:
 *       - Categories
 *     summary: Get all categories
 *     description: Returns a list of all product categories sorted alphabetically
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
 */
