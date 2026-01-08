/**
 * @swagger
 * /api/transfers:
 *   get:
 *     tags:
 *       - Transfers
 *     summary: Get transfer history (Admin only)
 *     description: |
 *       Returns a list of all transfer transactions including transfers to sellers and returns to warehouse.
 *
 *       **Behavior:**
 *       - Returns all transfer records in the system
 *       - Includes both "transfer" (warehouse → seller) and "return" (seller → warehouse) types
 *       - Results are sorted by creation date (newest first)
 *       - Includes populated seller and product information
 *
 *       **Use Cases:**
 *       - View complete transfer history across all sellers
 *       - Audit stock movements between warehouse and sellers
 *       - Track product distribution to sellers
 *       - Monitor return transactions
 *       - Generate transfer reports for inventory management
 *
 *       **Record Types:**
 *       - **transfer**: Products moved from warehouse to seller
 *       - **return**: Products returned from seller to warehouse
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
 *             examples:
 *               transferHistory:
 *                 summary: Transfer history with multiple records
 *                 value:
 *                   transfers:
 *                     - _id: "507f1f77bcf86cd799439030"
 *                       seller:
 *                         _id: "507f1f77bcf86cd799439015"
 *                         username: "john_seller"
 *                         firstName: "John"
 *                         lastName: "Doe"
 *                       product:
 *                         _id: "507f1f77bcf86cd799439011"
 *                         name: "Nike Air Max"
 *                         sku: "NAM-001"
 *                       quantity: 50
 *                       type: "transfer"
 *                       status: "completed"
 *                       createdAt: "2024-01-15T10:00:00.000Z"
 *                     - _id: "507f1f77bcf86cd799439031"
 *                       seller:
 *                         _id: "507f1f77bcf86cd799439015"
 *                         username: "john_seller"
 *                         firstName: "John"
 *                         lastName: "Doe"
 *                       product:
 *                         _id: "507f1f77bcf86cd799439012"
 *                         name: "Adidas Boost"
 *                         sku: "AB-002"
 *                       quantity: 10
 *                       type: "return"
 *                       status: "completed"
 *                       createdAt: "2024-01-14T15:30:00.000Z"
 *               emptyTransfers:
 *                 summary: No transfers found
 *                 value:
 *                   transfers: []
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
 *                 summary: Seller trying to view all transfers
 *                 value:
 *                   error: "Only administrators can view transfer history"
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
 *                   error: "Failed to retrieve transfers"
 */

/**
 * @swagger
 * /api/transfers:
 *   post:
 *     tags:
 *       - Transfers
 *     summary: Create new transfer(s) (Admin only)
 *     description: |
 *       Transfers products from warehouse to a seller. Can transfer multiple products in one atomic transaction.
 *
 *       **Behavior:**
 *       - Transfers products from warehouse stock to seller stock
 *       - Can transfer multiple products in a single request
 *       - Automatically assigns products to seller if not already assigned
 *       - Reactivates product assignment if previously unassigned
 *       - Creates transfer records for audit trail
 *       - Transaction is atomic (all or nothing)
 *
 *       **Use Cases:**
 *       - Distribute inventory from warehouse to sellers
 *       - Initial stock allocation to new sellers
 *       - Replenish seller stock when running low
 *       - Bulk transfer multiple products at once
 *       - Prepare seller inventory for sales periods
 *
 *       **Validation:**
 *       - Seller must exist and have "seller" role
 *       - All products must exist in the system
 *       - Warehouse must have sufficient stock for each product
 *       - Quantities must be positive numbers
 *       - Items array must not be empty
 *
 *       **Stock Management:**
 *       - Deducts quantity from warehouse stock
 *       - Adds quantity to seller's stock
 *       - Creates SellerProduct relationship if doesn't exist
 *       - Activates product for seller if inactive
 *       - All operations in MongoDB transaction (rollback on error)
 *
 *       **Transaction Safety:**
 *       - Uses MongoDB sessions for atomicity
 *       - If any item fails, entire transfer is rolled back
 *       - Warehouse stock is locked during transfer
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
 *                 description: ID of the seller to transfer products to (required, must exist with "seller" role)
 *                 example: "507f1f77bcf86cd799439011"
 *               items:
 *                 type: array
 *                 description: Array of products to transfer (required, must not be empty)
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: Product ID to transfer (required, must exist)
 *                       example: "507f1f77bcf86cd799439012"
 *                     quantity:
 *                       type: number
 *                       description: Quantity to transfer (required, must be positive)
 *                       example: 10
 *                       minimum: 1
 *           examples:
 *             singleProduct:
 *               summary: Transfer single product
 *               value:
 *                 sellerId: "507f1f77bcf86cd799439015"
 *                 items:
 *                   - productId: "507f1f77bcf86cd799439011"
 *                     quantity: 50
 *             multipleProducts:
 *               summary: Bulk transfer multiple products
 *               value:
 *                 sellerId: "507f1f77bcf86cd799439015"
 *                 items:
 *                   - productId: "507f1f77bcf86cd799439011"
 *                     quantity: 50
 *                   - productId: "507f1f77bcf86cd799439012"
 *                     quantity: 30
 *                   - productId: "507f1f77bcf86cd799439013"
 *                     quantity: 20
 *             initialAllocation:
 *               summary: Initial stock allocation for new seller
 *               value:
 *                 sellerId: "507f1f77bcf86cd799439016"
 *                 items:
 *                   - productId: "507f1f77bcf86cd799439011"
 *                     quantity: 100
 *                   - productId: "507f1f77bcf86cd799439012"
 *                     quantity: 75
 *     responses:
 *       201:
 *         description: Transfer(s) created successfully - Products transferred from warehouse to seller
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Successfully created transfers"
 *                 transfers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transfer'
 *             examples:
 *               singleTransfer:
 *                 summary: Single product transfer successful
 *                 value:
 *                   message: "Successfully created transfers"
 *                   transfers:
 *                     - _id: "507f1f77bcf86cd799439030"
 *                       seller:
 *                         _id: "507f1f77bcf86cd799439015"
 *                         username: "john_seller"
 *                         firstName: "John"
 *                         lastName: "Doe"
 *                       product:
 *                         _id: "507f1f77bcf86cd799439011"
 *                         name: "Nike Air Max"
 *                         sku: "NAM-001"
 *                       quantity: 50
 *                       type: "transfer"
 *                       status: "completed"
 *               bulkTransfer:
 *                 summary: Multiple products transferred
 *                 value:
 *                   message: "Successfully created transfers"
 *                   transfers:
 *                     - _id: "507f1f77bcf86cd799439030"
 *                       seller:
 *                         _id: "507f1f77bcf86cd799439015"
 *                         username: "john_seller"
 *                         firstName: "John"
 *                         lastName: "Doe"
 *                       product:
 *                         _id: "507f1f77bcf86cd799439011"
 *                         name: "Nike Air Max"
 *                         sku: "NAM-001"
 *                       quantity: 50
 *                       type: "transfer"
 *                       status: "completed"
 *                     - _id: "507f1f77bcf86cd799439031"
 *                       seller:
 *                         _id: "507f1f77bcf86cd799439015"
 *                         username: "john_seller"
 *                         firstName: "John"
 *                         lastName: "Doe"
 *                       product:
 *                         _id: "507f1f77bcf86cd799439012"
 *                         name: "Adidas Boost"
 *                         sku: "AB-002"
 *                       quantity: 30
 *                       type: "transfer"
 *                       status: "completed"
 *       400:
 *         description: Bad request - Invalid input, insufficient warehouse stock, or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               insufficientStock:
 *                 summary: Warehouse has insufficient stock
 *                 value:
 *                   error: "Omborda yetarli mahsulot yo'q: Nike Air Max. Mavjud: 30, So'ralgan: 50"
 *               emptyItems:
 *                 summary: Items array is empty
 *                 value:
 *                   error: "Items array is required"
 *               invalidQuantity:
 *                 summary: Invalid quantity value
 *                 value:
 *                   error: "Invalid quantity for product 507f1f77bcf86cd799439011"
 *               productNotFound:
 *                 summary: One or more products not found
 *                 value:
 *                   error: "One or more products not found"
 *               missingFields:
 *                 summary: Required fields missing
 *                 value:
 *                   error: "sellerId and items are required"
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
 *                 summary: Seller trying to create transfer
 *                 value:
 *                   error: "Only administrators can create transfers"
 *       404:
 *         description: Seller not found - The specified seller does not exist or is not a seller
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               sellerNotFound:
 *                 summary: Seller does not exist
 *                 value:
 *                   error: "Sotuvchi topilmadi"
 *               notSellerRole:
 *                 summary: User is not a seller
 *                 value:
 *                   error: "User is not a seller"
 *               invalidSellerId:
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
 *               transactionError:
 *                 summary: Transaction failed and rolled back
 *                 value:
 *                   error: "Transaction failed - no products transferred"
 *               stockLockError:
 *                 summary: Failed to lock warehouse stock
 *                 value:
 *                   error: "Failed to acquire stock lock"
 */

module.exports = {};
