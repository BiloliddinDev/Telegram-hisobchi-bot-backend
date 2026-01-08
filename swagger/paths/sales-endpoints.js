/**
 * @swagger
 * /api/sales:
 *   post:
 *     tags:
 *       - Sales
 *     summary: Create a new sale
 *     description: |
 *       Creates a new sale transaction and automatically deducts stock.
 *
 *       **Behavior:**
 *       - Sellers can only sell products assigned to them
 *       - Admins can sell any product
 *       - Stock is automatically deducted from seller's inventory
 *       - Total amount is calculated automatically (quantity × price)
 *       - Transaction is atomic (uses MongoDB sessions)
 *
 *       **Use Cases:**
 *       - Record product sales transactions
 *       - Track customer purchase information
 *       - Automatically update seller stock levels
 *       - Maintain sales history with customer details
 *       - Generate sales reports and analytics
 *
 *       **Validation:**
 *       - Product must exist in system
 *       - Seller must have product assigned to them
 *       - Sufficient stock must be available in seller's inventory
 *       - Quantity must be positive number
 *       - Price must be positive number
 *
 *       **Stock Management:**
 *       - Checks seller's stock before sale
 *       - Deducts quantity from SellerStock
 *       - Fails if insufficient stock (Sizda yetarli mahsulot yo'q)
 *       - Creates transfer record for audit trail
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
 *                 description: ID of the product being sold (required)
 *                 example: "507f1f77bcf86cd799439011"
 *               quantity:
 *                 type: number
 *                 description: Quantity being sold (required, must be positive)
 *                 example: 2
 *                 minimum: 1
 *               price:
 *                 type: number
 *                 description: Price per unit (required, must be positive)
 *                 example: 150000
 *                 minimum: 0
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
 *           examples:
 *             basicSale:
 *               summary: Basic sale with required fields only
 *               value:
 *                 productId: "507f1f77bcf86cd799439011"
 *                 quantity: 2
 *                 price: 150000
 *             fullSale:
 *               summary: Complete sale with customer details
 *               value:
 *                 productId: "507f1f77bcf86cd799439011"
 *                 quantity: 1
 *                 price: 150000
 *                 customerName: "John Doe"
 *                 customerPhone: "+998901234567"
 *                 notes: "Customer requested gift wrapping and express delivery"
 *             bulkSale:
 *               summary: Bulk sale transaction
 *               value:
 *                 productId: "507f1f77bcf86cd799439011"
 *                 quantity: 10
 *                 price: 140000
 *                 customerName: "ABC Company"
 *                 customerPhone: "+998901234567"
 *                 notes: "Wholesale order - 10% discount applied"
 *     responses:
 *       201:
 *         description: Sale created successfully - Stock deducted and transaction recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sale:
 *                   $ref: '#/components/schemas/Sale'
 *             examples:
 *               success:
 *                 summary: Sale created successfully
 *                 value:
 *                   sale:
 *                     _id: "507f1f77bcf86cd799439020"
 *                     seller:
 *                       _id: "507f1f77bcf86cd799439015"
 *                       username: "john_seller"
 *                       firstName: "John"
 *                       lastName: "Doe"
 *                     product:
 *                       _id: "507f1f77bcf86cd799439011"
 *                       name: "Nike Air Max"
 *                       price: 150000
 *                       image: "https://example.com/image.jpg"
 *                     quantity: 2
 *                     price: 150000
 *                     totalAmount: 300000
 *                     customerName: "Jane Smith"
 *                     customerPhone: "+998901234567"
 *                     notes: "Customer requested gift wrapping"
 *                     timestamp: "2024-01-15T14:30:00.000Z"
 *       400:
 *         description: Bad request - Insufficient stock or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               insufficientStock:
 *                 summary: Seller has insufficient stock
 *                 value:
 *                   error: "Sizda yetarli mahsulot yo'q"
 *               invalidQuantity:
 *                 summary: Invalid quantity value
 *                 value:
 *                   error: "Quantity must be a positive number"
 *               invalidPrice:
 *                 summary: Invalid price value
 *                 value:
 *                   error: "Price must be a positive number"
 *               missingFields:
 *                 summary: Required fields missing
 *                 value:
 *                   error: "productId, quantity, and price are required"
 *       401:
 *         description: Authentication required - No valid authentication token provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               noAuth:
 *                 summary: Missing authentication
 *                 value:
 *                   error: "Authentication required"
 *               invalidToken:
 *                 summary: Invalid token
 *                 value:
 *                   error: "Invalid authentication token"
 *       403:
 *         description: Forbidden - Seller does not have access to this product
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               noAccess:
 *                 summary: Product not assigned to seller
 *                 value:
 *                   error: "You do not have access to this productId"
 *               productNotAssigned:
 *                 summary: Product not in seller's inventory
 *                 value:
 *                   error: "This product is not assigned to you"
 *       404:
 *         description: Product not found - The specified product does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notFound:
 *                 summary: Product does not exist
 *                 value:
 *                   error: "Product not found"
 *               invalidProductId:
 *                 summary: Invalid product ID format
 *                 value:
 *                   error: "Invalid product ID"
 *       500:
 *         description: Server error - Internal server error occurred
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               serverError:
 *                 summary: Database error
 *                 value:
 *                   error: "Internal server error"
 *               transactionError:
 *                 summary: Transaction failed
 *                 value:
 *                   error: "Transaction failed - stock not deducted"
 */

/**
 * @swagger
 * /api/sales:
 *   get:
 *     tags:
 *       - Sales
 *     summary: Get all sales
 *     description: |
 *       Returns a list of sales with optional date filtering.
 *
 *       **Behavior:**
 *       - Sellers can only see their own sales
 *       - Admins can see all sales from all sellers
 *       - Results are sorted by timestamp (newest first)
 *       - Includes populated seller and product information
 *
 *       **Use Cases:**
 *       - View sales history for a seller
 *       - Generate sales reports for specific date ranges
 *       - Track daily/weekly/monthly sales performance
 *       - Audit sales transactions
 *       - Monitor seller activity
 *
 *       **Filtering:**
 *       - Filter by date range using startDate and endDate
 *       - If no dates provided, returns all sales
 *       - Date format: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter sales from this date (inclusive)
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter sales up to this date (inclusive)
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
 *             examples:
 *               sellerSales:
 *                 summary: Seller's own sales
 *                 value:
 *                   sales:
 *                     - _id: "507f1f77bcf86cd799439020"
 *                       seller:
 *                         _id: "507f1f77bcf86cd799439015"
 *                         username: "john_seller"
 *                         firstName: "John"
 *                         lastName: "Doe"
 *                       product:
 *                         _id: "507f1f77bcf86cd799439011"
 *                         name: "Nike Air Max"
 *                         price: 150000
 *                         image: "https://example.com/image.jpg"
 *                       quantity: 2
 *                       price: 150000
 *                       totalAmount: 300000
 *                       timestamp: "2024-01-15T14:30:00.000Z"
 *                     - _id: "507f1f77bcf86cd799439021"
 *                       seller:
 *                         _id: "507f1f77bcf86cd799439015"
 *                         username: "john_seller"
 *                         firstName: "John"
 *                         lastName: "Doe"
 *                       product:
 *                         _id: "507f1f77bcf86cd799439012"
 *                         name: "Adidas Boost"
 *                         price: 180000
 *                         image: "https://example.com/image2.jpg"
 *                       quantity: 1
 *                       price: 180000
 *                       totalAmount: 180000
 *                       timestamp: "2024-01-14T10:15:00.000Z"
 *               emptySales:
 *                 summary: No sales found
 *                 value:
 *                   sales: []
 *       401:
 *         description: Authentication required - No valid authentication token provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               noAuth:
 *                 summary: Missing authentication
 *                 value:
 *                   error: "Authentication required"
 *               invalidToken:
 *                 summary: Invalid token
 *                 value:
 *                   error: "Invalid authentication token"
 *       500:
 *         description: Server error - Internal server error occurred
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               serverError:
 *                 summary: Database error
 *                 value:
 *                   error: "Internal server error"
 *               queryError:
 *                 summary: Invalid date format
 *                 value:
 *                   error: "Invalid date format"
 */

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     tags:
 *       - Sales
 *     summary: Get single sale by ID
 *     description: |
 *       Returns detailed information about a specific sale transaction.
 *
 *       **Behavior:**
 *       - Sellers can only view their own sales
 *       - Admins can view any sale
 *       - Returns populated seller and product information
 *       - Includes all sale details (customer info, notes, etc.)
 *
 *       **Use Cases:**
 *       - View complete sale transaction details
 *       - Verify sale information for customer service
 *       - Audit individual transactions
 *       - Print receipts or invoices
 *       - Review sale with customer information
 *
 *       **Access Control:**
 *       - Sellers: Only their own sales (seller field matches user ID)
 *       - Admins: All sales across all sellers
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sale ID to retrieve
 *         example: "507f1f77bcf86cd799439020"
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
 *             examples:
 *               success:
 *                 summary: Sale details retrieved
 *                 value:
 *                   sale:
 *                     _id: "507f1f77bcf86cd799439020"
 *                     seller:
 *                       _id: "507f1f77bcf86cd799439015"
 *                       username: "john_seller"
 *                       firstName: "John"
 *                       lastName: "Doe"
 *                     product:
 *                       _id: "507f1f77bcf86cd799439011"
 *                       name: "Nike Air Max"
 *                       price: 150000
 *                       image: "https://example.com/image.jpg"
 *                     quantity: 2
 *                     price: 150000
 *                     totalAmount: 300000
 *                     customerName: "Jane Smith"
 *                     customerPhone: "+998901234567"
 *                     notes: "Customer requested gift wrapping"
 *                     timestamp: "2024-01-15T14:30:00.000Z"
 *       401:
 *         description: Authentication required - No valid authentication token provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               noAuth:
 *                 summary: Missing authentication
 *                 value:
 *                   error: "Authentication required"
 *               invalidToken:
 *                 summary: Invalid token
 *                 value:
 *                   error: "Invalid authentication token"
 *       403:
 *         description: Access denied - Sellers can only view their own sales
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notOwnSale:
 *                 summary: Seller trying to view another seller's sale
 *                 value:
 *                   error: "Access denied - you can only view your own sales"
 *               sellerRestriction:
 *                 summary: Insufficient permissions
 *                 value:
 *                   error: "Sellers can only view their own sales"
 *       404:
 *         description: Sale not found - The specified sale does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notFound:
 *                 summary: Sale does not exist
 *                 value:
 *                   error: "Sale not found"
 *               invalidId:
 *                 summary: Invalid sale ID format
 *                 value:
 *                   error: "Invalid sale ID"
 *       500:
 *         description: Server error - Internal server error occurred
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               serverError:
 *                 summary: Database error
 *                 value:
 *                   error: "Internal server error"
 *               queryError:
 *                 summary: Database query failed
 *                 value:
 *                   error: "Failed to retrieve sale"
 */

module.exports = {};
