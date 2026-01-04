/**
 * @swagger
 * /api/sales:
 *   post:
 *     tags:
 *       - Sales
 *     summary: Create a new sale
 *     description: Creates a new sale. Sellers can only sell products assigned to them, admins can sell any product. Stock is automatically deducted.
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
 *                 description: ID of the product being sold
 *                 example: "507f1f77bcf86cd799439011"
 *               quantity:
 *                 type: number
 *                 description: Quantity being sold
 *                 example: 2
 *               price:
 *                 type: number
 *                 description: Price per unit
 *                 example: 150000
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
 *                 description: Additional notes about the sale (optional)
 *                 example: "Customer requested gift wrapping"
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
 *         description: Insufficient stock or invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Seller does not have access to this product
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/sales:
 *   get:
 *     tags:
 *       - Sales
 *     summary: Get all sales
 *     description: Returns a list of sales. Sellers can only see their own sales, admins can see all sales.
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter sales from this date
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter sales up to this date
 *         example: "2024-12-31T23:59:59.999Z"
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
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     tags:
 *       - Sales
 *     summary: Get single sale by ID
 *     description: Returns detailed information about a specific sale. Sellers can only view their own sales.
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
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied - sellers can only view their own sales
 *       404:
 *         description: Sale not found
 *       500:
 *         description: Server error
 */

module.exports = {};
