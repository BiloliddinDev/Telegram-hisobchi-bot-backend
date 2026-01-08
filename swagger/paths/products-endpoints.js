/**
 * @swagger
 * /api/products:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get all products (Admin only)
 *     description: Returns a list of all products in the system with category and seller information
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category ID for filtering
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Product name or SKU for filtering
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of items per page
 *     security:
 *       - TelegramAuth: []
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/ProductPagination'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get single product by ID
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
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags:
 *       - Products
 *     summary: Create new product (Admin only)
 *     description: |
 *       Creates a new product in the system with initial warehouse stock.
 *
 *       **Behavior:**
 *       - Validates that the specified category exists
 *       - Creates product with initial warehouse quantity
 *       - All fields except image, sku, color, and description are required
 *       - Product is created as active by default
 *
 *       **Use Cases:**
 *       - Add new product to inventory system
 *       - Set initial warehouse stock for new products
 *       - Link products to existing categories
 *       - Track products with SKU and color variants
 *
 *       **Validation:**
 *       - Category must exist in the system
 *       - Price and cost price must be positive numbers
 *       - Warehouse quantity must be non-negative
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
 *               - category
 *               - warehouseQuantity
 *             properties:
 *               name:
 *                 type: string
 *                 description: Product name (required)
 *                 example: "Nike Air Max"
 *                 minLength: 1
 *               description:
 *                 type: string
 *                 description: Product description (optional)
 *                 example: "Comfortable running shoes"
 *               price:
 *                 type: number
 *                 description: Selling price (required, must be positive)
 *                 example: 150000
 *                 minimum: 0
 *               costPrice:
 *                 type: number
 *                 description: Cost price (required, must be positive)
 *                 example: 100000
 *                 minimum: 0
 *               category:
 *                 type: string
 *                 description: Category ID (required, must exist)
 *                 example: "507f1f77bcf86cd799439011"
 *               warehouseQuantity:
 *                 type: number
 *                 description: Initial warehouse stock (required, must be non-negative)
 *                 example: 100
 *                 minimum: 0
 *               image:
 *                 type: string
 *                 description: Product image URL (optional)
 *                 example: "https://example.com/image.jpg"
 *               sku:
 *                 type: string
 *                 description: Product SKU - Stock Keeping Unit (optional)
 *                 example: "NAM-001"
 *               color:
 *                 type: string
 *                 description: Product color (optional)
 *                 example: "Black"
 *           examples:
 *             basicProduct:
 *               summary: Basic product with required fields only
 *               value:
 *                 name: "Adidas Ultraboost"
 *                 price: 180000
 *                 costPrice: 120000
 *                 category: "507f1f77bcf86cd799439011"
 *                 warehouseQuantity: 50
 *             fullProduct:
 *               summary: Complete product with all fields
 *               value:
 *                 name: "Nike Air Max 90"
 *                 description: "Classic sneaker with Air cushioning technology"
 *                 price: 150000
 *                 costPrice: 100000
 *                 category: "507f1f77bcf86cd799439011"
 *                 warehouseQuantity: 100
 *                 image: "https://example.com/images/nike-air-max-90.jpg"
 *                 sku: "NAM90-BLK-42"
 *                 color: "Black"
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
 *             examples:
 *               success:
 *                 summary: Product created
 *                 value:
 *                   product:
 *                     _id: "507f1f77bcf86cd799439012"
 *                     name: "Nike Air Max"
 *                     description: "Comfortable running shoes"
 *                     price: 150000
 *                     costPrice: 100000
 *                     category:
 *                       _id: "507f1f77bcf86cd799439011"
 *                       name: "Shoes"
 *                     warehouseQuantity: 100
 *                     image: "https://example.com/image.jpg"
 *                     sku: "NAM-001"
 *                     color: "Black"
 *                     isActive: true
 *       400:
 *         description: Bad request - Invalid input or category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               categoryNotFound:
 *                 summary: Category does not exist
 *                 value:
 *                   error: "Category not found"
 *               missingFields:
 *                 summary: Required fields missing
 *                 value:
 *                   error: "name, price, costPrice, category, and warehouseQuantity are required"
 *               invalidPrice:
 *                 summary: Invalid price value
 *                 value:
 *                   error: "Price must be a positive number"
 *               invalidQuantity:
 *                 summary: Invalid warehouse quantity
 *                 value:
 *                   error: "Warehouse quantity must be non-negative"
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
 *                 summary: Seller trying to create product
 *                 value:
 *                   error: "Only administrators can create products"
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
 *               connectionError:
 *                 summary: Database connection failed
 *                 value:
 *                   error: "Database connection error"
 */

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags:
 *       - Products
 *     summary: Update product (Admin only)
 *     description: |
 *       Fully updates an existing product - all required fields must be provided.
 *
 *       **Behavior:**
 *       - Requires ALL required fields (name, price, costPrice, category, warehouseQuantity)
 *       - Validates that the new category exists
 *       - Updates product and returns updated document
 *       - Use PATCH for partial updates
 *
 *       **Use Cases:**
 *       - Complete product information update
 *       - Change product category
 *       - Update pricing and stock levels
 *       - Activate/deactivate products
 *
 *       **Validation:**
 *       - Product must exist
 *       - Category must exist
 *       - All required fields must be provided
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID to update
 *         example: "507f1f77bcf86cd799439012"
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
 *               - category
 *               - warehouseQuantity
 *             properties:
 *               name:
 *                 type: string
 *                 description: Product name (required)
 *                 minLength: 1
 *               description:
 *                 type: string
 *                 description: Product description
 *               price:
 *                 type: number
 *                 description: Selling price (required)
 *                 minimum: 0
 *               costPrice:
 *                 type: number
 *                 description: Cost price (required)
 *                 minimum: 0
 *               category:
 *                 type: string
 *                 description: Category ID (required)
 *               warehouseQuantity:
 *                 type: number
 *                 description: Warehouse stock (required)
 *                 minimum: 0
 *               image:
 *                 type: string
 *                 description: Product image URL
 *               sku:
 *                 type: string
 *                 description: Product SKU
 *               color:
 *                 type: string
 *                 description: Product color
 *               isActive:
 *                 type: boolean
 *                 description: Product active status
 *           examples:
 *             fullUpdate:
 *               summary: Complete product update
 *               value:
 *                 name: "Nike Air Max 90 Updated"
 *                 description: "Updated description with new features"
 *                 price: 160000
 *                 costPrice: 110000
 *                 category: "507f1f77bcf86cd799439011"
 *                 warehouseQuantity: 150
 *                 image: "https://example.com/updated-image.jpg"
 *                 sku: "NAM90-UPD-001"
 *                 color: "White"
 *                 isActive: true
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
 *             examples:
 *               success:
 *                 summary: Product updated
 *                 value:
 *                   product:
 *                     _id: "507f1f77bcf86cd799439012"
 *                     name: "Nike Air Max 90 Updated"
 *                     price: 160000
 *                     costPrice: 110000
 *                     category:
 *                       _id: "507f1f77bcf86cd799439011"
 *                       name: "Shoes"
 *                     warehouseQuantity: 150
 *                     isActive: true
 *       400:
 *         description: Bad request - Invalid input or category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               categoryNotFound:
 *                 summary: Category does not exist
 *                 value:
 *                   error: "Category not found"
 *               missingFields:
 *                 summary: Required fields missing
 *                 value:
 *                   error: "All required fields must be provided for PUT request"
 *               invalidData:
 *                 summary: Invalid data format
 *                 value:
 *                   error: "Invalid data format"
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
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notFound:
 *                 summary: Product does not exist
 *                 value:
 *                   error: "Product not found"
 *               invalidId:
 *                 summary: Invalid product ID
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
 */

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     tags:
 *       - Products
 *     summary: Partial update product (Admin only)
 *     description: |
 *       Partially updates an existing product - only provided fields will be updated.
 *
 *       **Behavior:**
 *       - Updates only the fields provided in request body
 *       - At least one field must be provided
 *       - Validates category if provided
 *       - More flexible than PUT (doesn't require all fields)
 *
 *       **Use Cases:**
 *       - Update only product price without changing other fields
 *       - Change warehouse quantity only
 *       - Toggle product active status
 *       - Update product image or description
 *       - Quick category reassignment
 *
 *       **Validation:**
 *       - Product must exist
 *       - If category is provided, it must exist
 *       - At least one valid field must be provided
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID to update
 *         example: "507f1f77bcf86cd799439012"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Product name
 *                 minLength: 1
 *               description:
 *                 type: string
 *                 description: Product description
 *               price:
 *                 type: number
 *                 description: Selling price
 *                 minimum: 0
 *               costPrice:
 *                 type: number
 *                 description: Cost price
 *                 minimum: 0
 *               category:
 *                 type: string
 *                 description: Category ID
 *               warehouseQuantity:
 *                 type: number
 *                 description: Warehouse stock
 *                 minimum: 0
 *               image:
 *                 type: string
 *                 description: Product image URL
 *               sku:
 *                 type: string
 *                 description: Product SKU
 *               color:
 *                 type: string
 *                 description: Product color
 *               isActive:
 *                 type: boolean
 *                 description: Product active status
 *           examples:
 *             priceUpdate:
 *               summary: Update only price
 *               value:
 *                 price: 165000
 *             stockUpdate:
 *               summary: Update warehouse quantity
 *               value:
 *                 warehouseQuantity: 200
 *             deactivate:
 *               summary: Deactivate product
 *               value:
 *                 isActive: false
 *             multipleFields:
 *               summary: Update multiple fields
 *               value:
 *                 price: 155000
 *                 warehouseQuantity: 175
 *                 image: "https://example.com/new-image.jpg"
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
 *             examples:
 *               success:
 *                 summary: Product partially updated
 *                 value:
 *                   product:
 *                     _id: "507f1f77bcf86cd799439012"
 *                     name: "Nike Air Max"
 *                     price: 165000
 *                     warehouseQuantity: 200
 *                     isActive: true
 *       400:
 *         description: Bad request - Invalid input or no valid fields provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               noFields:
 *                 summary: No valid fields to update
 *                 value:
 *                   error: "No valid fields to update"
 *               categoryNotFound:
 *                 summary: Category does not exist
 *                 value:
 *                   error: "Category not found"
 *               invalidValue:
 *                 summary: Invalid field value
 *                 value:
 *                   error: "Invalid value for field"
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
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notFound:
 *                 summary: Product does not exist
 *                 value:
 *                   error: "Product not found"
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
 * /api/products/{id}:
 *   delete:
 *     tags:
 *       - Products
 *     summary: Delete product (Admin only) - ⚠️ Currently Disabled
 *     description: |
 *       **⚠️ IMPORTANT: This endpoint is currently disabled in the implementation.**
 *
 *       The actual delete logic is commented out in the code (routes/products.js lines 192-196).
 *       This endpoint currently returns a success message without performing any actual deletion.
 *       This may be intentional for data preservation and audit trail purposes.
 *
 *       **Current Behavior:**
 *       - Always returns 200 with success message
 *       - Does NOT actually delete the product from database
 *       - Does NOT check if product exists
 *
 *       **Use Cases:**
 *       - Soft delete acknowledgment (current implementation)
 *       - Future: Hard delete when implementation is enabled
 *
 *       **To Enable Actual Deletion:**
 *       Uncomment the implementation in routes/products.js:
 *       ```javascript
 *       const product = await Product.findByIdAndDelete(req.params.id);
 *       if (!product) {
 *         return res.status(404).json({ error: "Product not found" });
 *       }
 *       ```
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID to delete
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Product deletion acknowledged (Note - actual deletion is currently disabled)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product deleted successfully"
 *             examples:
 *               success:
 *                 summary: Deletion acknowledged
 *                 value:
 *                   message: "Product deleted successfully"
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
 *                 summary: Seller trying to delete
 *                 value:
 *                   error: "Only administrators can delete products"
 *       404:
 *         description: Product not found (only applicable if deletion logic is re-enabled)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notFound:
 *                 summary: Product does not exist
 *                 value:
 *                   error: "Product not found"
 *               invalidId:
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
 *               connectionError:
 *                 summary: Database connection failed
 *                 value:
 *                   error: "Database connection error"
 */

module.exports = {};
