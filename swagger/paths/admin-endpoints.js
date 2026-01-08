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
 * /api/admin/sellers/{id}:
 *   get:
 *     tags:
 *       - Admin - User Management
 *     summary: Get specific seller
 *     description: Returns a specific seller by ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Seller retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
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
 * /api/admin/sellers:
 *   post:
 *     tags:
 *       - Admin - User Management
 *     summary: Create new seller
 *     description: |
 *       Creates a new seller account in the system.
 *
 *       **Behavior:**
 *       - Creates user with "seller" role
 *       - Phone number must be unique (duplicate check)
 *       - Telegram ID is optional but recommended
 *       - User is created as active by default
 *       - Username is optional
 *
 *       **Use Cases:**
 *       - Onboard new sellers to the system
 *       - Register sales representatives
 *       - Add team members for product distribution
 *       - Create user accounts for inventory management
 *
 *       **Validation:**
 *       - Phone number must be unique
 *       - First name and last name are required
 *       - Phone number format should follow standards
 *       - Telegram ID should be valid if provided
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
 *               - lastName
 *               - phoneNumber
 *             properties:
 *               telegramId:
 *                 type: string
 *                 description: Telegram user ID (optional, recommended for bot integration)
 *                 example: "1234567890"
 *               username:
 *                 type: string
 *                 description: Username (optional)
 *                 example: "john_doe"
 *               firstName:
 *                 type: string
 *                 description: First name (required)
 *                 example: "John"
 *                 minLength: 1
 *               lastName:
 *                 type: string
 *                 description: Last name (required)
 *                 example: "Doe"
 *                 minLength: 1
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number (required, must be unique)
 *                 example: "+998901234567"
 *                 pattern: "^\\+998[0-9]{9}$"
 *           examples:
 *             basicSeller:
 *               summary: Create seller with required fields only
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 phoneNumber: "+998901234567"
 *             fullSeller:
 *               summary: Create seller with all fields
 *               value:
 *                 telegramId: "1234567890"
 *                 username: "john_seller"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 phoneNumber: "+998901234567"
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
 *             examples:
 *               success:
 *                 summary: Seller successfully created
 *                 value:
 *                   seller:
 *                     _id: "507f1f77bcf86cd799439015"
 *                     telegramId: "1234567890"
 *                     username: "john_seller"
 *                     firstName: "John"
 *                     lastName: "Doe"
 *                     phoneNumber: "+998901234567"
 *                     role: "seller"
 *                     isActive: true
 *       400:
 *         description: Bad request - Phone number already exists or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               phoneExists:
 *                 summary: Phone number already registered
 *                 value:
 *                   error: "Ushbu telefon raqamli foydalanuvchi allaqachon mavjud"
 *               missingFields:
 *                 summary: Required fields missing
 *                 value:
 *                   error: "firstName, lastName, and phoneNumber are required"
 *               invalidPhone:
 *                 summary: Invalid phone number format
 *                 value:
 *                   error: "Invalid phone number format"
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
 *         description: Admin access required - User is not an administrator
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notAdmin:
 *                 summary: Insufficient permissions
 *                 value:
 *                   error: "Admin access required"
 *               sellerAttempt:
 *                 summary: Seller trying to create another seller
 *                 value:
 *                   error: "Only administrators can create seller accounts"
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
 *               dbError:
 *                 summary: Database connection failed
 *                 value:
 *                   error: "Failed to create seller account"
 */

/**
 * @swagger
 * /api/admin/sellers/{id}:
 *   put:
 *     tags:
 *       - Admin - User Management
 *     summary: Update seller information
 *     description: Updates an existing seller's information
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
 *                 description: Username
 *                 example: "john_doe_updated"
 *               firstName:
 *                 type: string
 *                 description: First name
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 description: Last name
 *                 example: "Doe"
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number
 *                 example: "+998901234567"
 *               avatarUrl:
 *                 type: string
 *                 description: Avatar image URL
 *                 example: "https://example.com/avatar.jpg"
 *               isActive:
 *                 type: boolean
 *                 description: Active status
 *                 example: true
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
 * /api/admin/sellers/{sellerId}/products/{productId}/assign:
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
 *       404:
 *         description: Seller or product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'

/**
 * @swagger
 * /api/admin/sellers/{sellerId}/products/{productId}/unassign:
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
 */

/**
 * @swagger
 * /api/admin/seller-stocks/{stockId}:
 *   delete:
 *     tags:
 *       - Admin - Stock Management
 *     summary: Delete seller stock and return to warehouse
 *     description: |
 *       Returns all seller stock to warehouse and optionally unassigns the product from the seller.
 *
 *       **Behavior:**
 *       - Returns all current stock quantity back to warehouse
 *       - Creates a transfer record for audit trail
 *       - If stock quantity is 0, still proceeds (idempotent)
 *       - Optionally unassigns product if `unassign=true` query parameter is provided
 *
 *       **Use Cases:**
 *       - `/seller-stocks/{id}` - Returns stock but keeps product assigned
 *
 *       - `/seller-stocks/{id}?unassign=true` - Returns stock AND unassigns product
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: stockId
 *         required: true
 *         schema:
 *           type: string
 *         description: SellerStock ID
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: unassign
 *         schema:
 *           type: boolean
 *         description: Whether to also unassign the product from seller
 *         example: true
 *     responses:
 *       200:
 *         description: Seller stock returned to warehouse successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Stock returned to warehouse successfully"
 *             examples:
 *               withoutUnassign:
 *                 summary: Stock returned, product still assigned
 *                 value:
 *                   success: true
 *                   message: "Stock returned to warehouse successfully"
 *               withUnassign:
 *                 summary: Stock returned and product unassigned
 *                 value:
 *                   success: true
 *                   message: "Stock returned to warehouse and product unassigned successfully"
 *       400:
 *         description: Bad request - No stock to return or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               noStock:
 *                 summary: No stock to return
 *                 value:
 *                   error: "No stock to return"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: SellerStock not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "SellerStock not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * /api/admin/sellers/{sellerId}/products:
 *   get:
 *     tags:
 *        - Admin - Product Management
 *     summary: Get products for specific seller
 *     description: Returns all products for a specific seller
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
 *         description: Product details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 message:
 *                   type: string
 *                   description: Message if no products found
 *                   example: "No products found for this seller"
 */

/**
 * @swagger
 * /api/admin/sellers/{sellerId}/sales:
 *   get:
 *     tags:
 *        - Admin - Sales Management
 *     summary: Get sales for specific seller
 *     description: Returns all sales for a specific seller
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
 *         description: Seller details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sa:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 *                 message:
 *                   type: string
 *                   description: Message if no sales found
 *                   example: "No sales found for this seller"
 */

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     tags:
 *       - Admin - Reports
 *     summary: Get comprehensive report
 *     description: Returns detailed sales report with analytics, seller performance, and product insights
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *         description: start date
 *         example: 2026-01-01
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *         description: end date
 *         example: 2026-02-01
 *     responses:
 *       200:
 *         description: Range report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/sellers/{id}:
 *   delete:
 *     tags:
 *       - Admin - User Management
 *     summary: Delete seller (Admin only)
 *     description: |
 *       Soft deletes a seller from the system (marks as inactive).
 *
 *       **Behavior:**
 *       - Does NOT permanently delete the seller
 *       - Marks seller as inactive (isActive = false)
 *       - Preserves all seller data and history
 *       - Seller can be reactivated later if needed
 *
 *       **Use Cases:**
 *       - Temporarily deactivate seller accounts
 *       - Remove sellers from active duty while preserving history
 *       - Offboard sellers without losing transaction records
 *       - Suspend seller accounts for investigation
 *
 *       **Important:**
 *       - This is a soft delete (data preserved)
 *       - Sales history remains intact
 *       - Stock assignments may need separate handling
 *       - Can be reversed by updating isActive to true
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Seller ID to deactivate
 *         example: "507f1f77bcf86cd799439015"
 *     responses:
 *       200:
 *         description: Seller inactivated successfully (soft delete)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Seller inactivated successfully"
 *             examples:
 *               success:
 *                 summary: Seller soft deleted
 *                 value:
 *                   message: "Seller inactivated successfully"
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
 *         description: Admin access required - User is not an administrator
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notAdmin:
 *                 summary: Insufficient permissions
 *                 value:
 *                   error: "Admin access required"
 *               sellerAttempt:
 *                 summary: Seller trying to delete another seller
 *                 value:
 *                   error: "Only administrators can delete seller accounts"
 *       404:
 *         description: Seller not found - The specified seller does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notFound:
 *                 summary: Seller does not exist
 *                 value:
 *                   error: "Seller not found"
 *               notSeller:
 *                 summary: User is not a seller
 *                 value:
 *                   error: "User is not a seller"
 *               invalidId:
 *                 summary: Invalid seller ID format
 *                 value:
 *                   error: "Invalid seller ID"
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
 *               updateFailed:
 *                 summary: Failed to update seller status
 *                 value:
 *                   error: "Failed to inactivate seller"
 */
