/**
 * @swagger
 * /api/transfers:
 *   get:
 *     tags:
 *       - Transfers
 *     summary: Get transfer history (Admin only)
 *     description: Returns a list of all transfers including transfers to sellers and returns to warehouse
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
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/transfers:
 *   post:
 *     tags:
 *       - Transfers
 *     summary: Create new transfer(s) (Admin only)
 *     description: Transfers products from warehouse to a seller. Can transfer multiple products in one request.
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
 *                 description: ID of the seller to transfer products to
 *                 example: "507f1f77bcf86cd799439011"
 *               items:
 *                 type: array
 *                 description: Array of products to transfer
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: Product ID to transfer
 *                       example: "507f1f77bcf86cd799439012"
 *                     quantity:
 *                       type: number
 *                       description: Quantity to transfer
 *                       example: 10
 *     responses:
 *       201:
 *         description: Transfer(s) created successfully
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
 *         description: Invalid input, insufficient warehouse stock, or product not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Seller not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/transfers/{id}/return:
 *   post:
 *     tags:
 *       - Transfers
 *     summary: Return transfer to warehouse (Admin only)
 *     description: Returns products from a seller back to the warehouse. Supports full or partial returns.
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transfer ID to return
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *                 description: Quantity to return (optional - defaults to full transfer quantity)
 *                 example: 5
 *     responses:
 *       200:
 *         description: Stock returned to warehouse successfully
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
 *                   description: Quantity that was returned
 *                   example: 5
 *       400:
 *         description: Invalid input, insufficient seller stock, or cannot return a return transfer
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Transfer not found
 *       500:
 *         description: Server error
 */

module.exports = {};
