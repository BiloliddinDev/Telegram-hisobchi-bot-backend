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
 *     description: Creates a new product in the system
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
 *                 description: Product name
 *                 example: "Nike Air Max"
 *               description:
 *                 type: string
 *                 description: Product description
 *                 example: "Comfortable running shoes"
 *               price:
 *                 type: number
 *                 description: Selling price
 *                 example: 150000
 *               costPrice:
 *                 type: number
 *                 description: Cost price
 *                 example: 100000
 *               category:
 *                 type: string
 *                 description: Category ID
 *                 example: "507f1f77bcf86cd799439011"
 *               warehouseQuantity:
 *                 type: number
 *                 description: Initial warehouse stock
 *                 example: 100
 *               image:
 *                 type: string
 *                 description: Product image URL
 *                 example: "https://example.com/image.jpg"
 *               sku:
 *                 type: string
 *                 description: Product SKU
 *                 example: "NAM-001"
 *               color:
 *                 type: string
 *                 description: Product color
 *                 example: "Black"
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
 *       400:
 *         description: Invalid input or category not found
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
 *   put:
 *     tags:
 *       - Products
 *     summary: Update product (Admin only)
 *     description: Updates an existing product
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
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
 *                 description: Product name
 *               description:
 *                 type: string
 *                 description: Product description
 *               price:
 *                 type: number
 *                 description: Selling price
 *               costPrice:
 *                 type: number
 *                 description: Cost price
 *               category:
 *                 type: string
 *                 description: Category ID
 *               warehouseQuantity:
 *                 type: number
 *                 description: Warehouse stock
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
 *       400:
 *         description: Invalid input or category not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     tags:
 *       - Products
 *     summary: Partial Update product (Admin only)
 *     description: Partial Updates an existing product
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
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
 *               description:
 *                 type: string
 *                 description: Product description
 *               price:
 *                 type: number
 *                 description: Selling price
 *               costPrice:
 *                 type: number
 *                 description: Cost price
 *               category:
 *                 type: string
 *                 description: Category ID
 *               warehouseQuantity:
 *                 type: number
 *                 description: Warehouse stock
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
 *       400:
 *         description: Invalid input or category not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags:
 *       - Products
 *     summary: Delete product (Admin only)
 *     description: Deletes a product from the system
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
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product deleted successfully"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */

module.exports = {};
