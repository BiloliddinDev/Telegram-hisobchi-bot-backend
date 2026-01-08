/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags:
 *       - Categories
 *     summary: Get all categories
 *     description: Returns a list of all categories sorted by name
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
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/categories:
 *   post:
 *     tags:
 *       - Categories
 *     summary: Create new category (Admin only)
 *     description: |
 *       Creates a new category in the system.
 *
 *       **Duplicate Prevention:** If a category with the same name already exists,
 *       the request will fail with a 400 Bad Request error.
 *
 *       **Behavior:**
 *       - Checks for existing category with same name (case-sensitive)
 *       - Creates new category if name is unique
 *       - Returns created category with generated ID and timestamp
 *
 *       **Use Cases:**
 *       - Add new product categories to the system
 *       - Organize products by category type
 *       - Enable category-based filtering for products
 *       - Support multi-category inventory management
 *
 *       **Validation:**
 *       - Category name must not be empty
 *       - Category name must be unique
 *       - Admin authentication required
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
 *                 description: Category name (must be unique, case-sensitive)
 *                 example: "Shoes"
 *                 minLength: 1
 *           examples:
 *             shoesCategory:
 *               summary: Create shoes category
 *               value:
 *                 name: "Shoes"
 *             clothingCategory:
 *               summary: Create clothing category
 *               value:
 *                 name: "Clothing"
 *             accessoriesCategory:
 *               summary: Create accessories category
 *               value:
 *                 name: "Accessories"
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
 *             examples:
 *               success:
 *                 summary: Category successfully created
 *                 value:
 *                   category:
 *                     _id: "507f1f77bcf86cd799439011"
 *                     name: "Shoes"
 *                     createdAt: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Bad request - Category name is required or category already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               alreadyExists:
 *                 summary: Category already exists
 *                 value:
 *                   error: "Category already exists"
 *               nameRequired:
 *                 summary: Name is required
 *                 value:
 *                   error: "Category name is required"
 *               emptyName:
 *                 summary: Empty name provided
 *                 value:
 *                   error: "Category name cannot be empty"
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
 *                 summary: Seller trying to create category
 *                 value:
 *                   error: "Only administrators can create categories"
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
 *               duplicateKey:
 *                 summary: Database unique constraint violation
 *                 value:
 *                   error: "Category already exists"
 */

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     tags:
 *       - Categories
 *     summary: Update category (Admin only)
 *     description: |
 *       Updates an existing category name.
 *
 *       **Behavior:**
 *       - Updates category name to new value
 *       - Checks for duplicate names before updating
 *       - Returns updated category with new name
 *       - Category ID remains unchanged
 *
 *       **Use Cases:**
 *       - Rename categories for better organization
 *       - Fix typos in category names
 *       - Standardize category naming conventions
 *       - Update category names to match business changes
 *
 *       **Validation:**
 *       - Category must exist
 *       - New name must not be empty
 *       - New name must not conflict with existing categories
 *       - Admin authentication required
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID to update
 *         example: "507f1f77bcf86cd799439011"
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
 *                 description: New category name (must be unique)
 *                 example: "Athletic Shoes"
 *                 minLength: 1
 *           examples:
 *             renameCategory:
 *               summary: Rename category
 *               value:
 *                 name: "Athletic Shoes"
 *             fixTypo:
 *               summary: Fix typo in name
 *               value:
 *                 name: "Accessories"
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
 *             examples:
 *               success:
 *                 summary: Category updated
 *                 value:
 *                   category:
 *                     _id: "507f1f77bcf86cd799439011"
 *                     name: "Athletic Shoes"
 *                     createdAt: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Bad request - Category name is required or name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               nameRequired:
 *                 summary: Name is required
 *                 value:
 *                   error: "Category name is required"
 *               alreadyExists:
 *                 summary: Name already taken
 *                 value:
 *                   error: "Category already exists"
 *               emptyName:
 *                 summary: Empty name provided
 *                 value:
 *                   error: "Category name cannot be empty"
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
 *       404:
 *         description: Category not found - The specified category does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notFound:
 *                 summary: Category does not exist
 *                 value:
 *                   error: "Category not found"
 *               invalidId:
 *                 summary: Invalid category ID format
 *                 value:
 *                   error: "Invalid category ID"
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
 */

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     tags:
 *       - Categories
 *     summary: Delete category (Admin only)
 *     description: |
 *       Deletes a category from the system.
 *
 *       **Important:**
 *       - This is a permanent deletion operation
 *       - If category is in use by products, behavior depends on database constraints
 *       - Consider the impact on existing products before deletion
 *       - Returns 404 if category doesn't exist
 *
 *       **Behavior:**
 *       - Permanently removes category from database
 *       - Does not check for associated products (handled by DB constraints)
 *       - Returns success message upon deletion
 *
 *       **Use Cases:**
 *       - Remove unused or obsolete categories
 *       - Clean up duplicate or incorrect categories
 *       - System maintenance and category management
 *       - Archive old category structures
 *
 *       **Warnings:**
 *       - Cannot be undone
 *       - May fail if products are associated (depending on schema)
 *       - Admin-only operation for safety
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID to delete
 *         example: "507f1f77bcf86cd799439011"
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
 *             examples:
 *               success:
 *                 summary: Deletion successful
 *                 value:
 *                   message: "Category deleted successfully"
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
 *                 summary: Seller trying to delete category
 *                 value:
 *                   error: "Only administrators can delete categories"
 *       404:
 *         description: Category not found - The specified category does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notFound:
 *                 summary: Category does not exist
 *                 value:
 *                   error: "Category not found"
 *               invalidId:
 *                 summary: Invalid category ID format
 *                 value:
 *                   error: "Invalid category ID"
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
 *               constraintViolation:
 *                 summary: Category in use by products
 *                 value:
 *                   error: "Cannot delete category - it is in use by products"
 */

module.exports = {};
