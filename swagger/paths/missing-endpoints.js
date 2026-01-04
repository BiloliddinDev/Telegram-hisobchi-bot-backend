/**
 * @swagger
 * /api/admin/sellers:
 *   post:
 *     tags:
 *       - Admin - User Management
 *     summary: Create new seller
 *     description: Creates a new seller account in the system
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
 *               - phoneNumber
 *             properties:
 *               telegramId:
 *                 type: string
 *                 description: Telegram user ID
 *                 example: "123456789"
 *               username:
 *                 type: string
 *                 description: Username
 *                 example: "john_seller"
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
 *                 description: Phone number (must be unique)
 *                 example: "+998901234567"
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
 *                 message:
 *                   type: string
 *                   example: "Seller created successfully"
 *       400:
 *         description: Phone number already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ushbu telefon raqamli foydalanuvchi allaqachon mavjud"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/admin/sellers/{id}:
 *   put:
 *     tags:
 *       - Admin - User Management
 *     summary: Update seller information
 *     description: Updates an existing seller's profile information
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
 *                 example: "john_seller_updated"
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
 *                 description: Whether seller is active
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
 *       404:
 *         description: Seller not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *   delete:
 *     tags:
 *       - Admin - User Management
 *     summary: Delete seller
 *     description: Removes a seller account from the system
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Seller ID
 *     responses:
 *       200:
 *         description: Seller deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Seller deleted successfully"
 *       404:
 *         description: Seller not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/auth/me:
 *   put:
 *     tags:
 *       - Authentication
 *     summary: Update current user profile
 *     description: Updates the authenticated user's profile information
 *     security:
 *       - TelegramAuth: []
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
 *                 example: "john_doe"
 *               firstName:
 *                 type: string
 *                 description: First name
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 description: Last name
 *                 example: "Doe"
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 * /api/admin/products:
 *   get:
 *     tags:
 *       - Admin - Product Management
 *     summary: Get all products (Admin view)
 *     description: Returns all products with detailed information including category and assigned sellers (Admin only)
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/Product'
 *                       - type: object
 *                         properties:
 *                           category:
 *                             $ref: '#/components/schemas/Category'
 *                           assignedSellers:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 _id:
 *                                   type: string
 *                                 username:
 *                                   type: string
 *                                 firstName:
 *                                   type: string
 *                                 lastName:
 *                                   type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 *   post:
 *     tags:
 *       - Admin - Product Management
 *     summary: Create new product
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
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *                 description: Product name
 *                 example: "iPhone 15 Pro"
 *               description:
 *                 type: string
 *                 description: Product description
 *                 example: "Latest iPhone with advanced features"
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Selling price
 *                 example: 1200000
 *               costPrice:
 *                 type: number
 *                 minimum: 0
 *                 description: Cost price
 *                 example: 1000000
 *               category:
 *                 type: string
 *                 description: Category ID
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *               stock:
 *                 type: number
 *                 minimum: 0
 *                 description: Initial stock quantity
 *                 example: 50
 *               image:
 *                 type: string
 *                 description: Product image URL
 *                 example: "https://example.com/iphone15.jpg"
 *               sku:
 *                 type: string
 *                 description: Stock Keeping Unit
 *                 example: "IP15-PRO-256"
 *               color:
 *                 type: string
 *                 description: Product color
 *                 example: "Space Black"
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
 *                 message:
 *                   type: string
 *                   example: "Product created successfully"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/admin/products/{id}:
 *   get:
 *     tags:
 *       - Admin - Product Management
 *     summary: Get single product
 *     description: Returns detailed information about a specific product with category and assigned sellers
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
 *                   allOf:
 *                     - $ref: '#/components/schemas/Product'
 *                     - type: object
 *                       properties:
 *                         category:
 *                           $ref: '#/components/schemas/Category'
 *                         assignedSellers:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               username:
 *                                 type: string
 *                               firstName:
 *                                 type: string
 *                               lastName:
 *                                 type: string
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *   put:
 *     tags:
 *       - Admin - Product Management
 *     summary: Update product
 *     description: Updates an existing product's information
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
 *                 example: "iPhone 15 Pro Max"
 *               description:
 *                 type: string
 *                 description: Product description
 *                 example: "Updated iPhone with latest features"
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Selling price
 *                 example: 1300000
 *               costPrice:
 *                 type: number
 *                 minimum: 0
 *                 description: Cost price
 *                 example: 1100000
 *               category:
 *                 type: string
 *                 description: Category ID
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *               stock:
 *                 type: number
 *                 minimum: 0
 *                 description: Stock quantity
 *                 example: 75
 *               image:
 *                 type: string
 *                 description: Product image URL
 *                 example: "https://example.com/iphone15-pro-max.jpg"
 *               sku:
 *                 type: string
 *                 description: Stock Keeping Unit
 *                 example: "IP15-PRO-MAX-512"
 *               color:
 *                 type: string
 *                 description: Product color
 *                 example: "Deep Purple"
 *               isActive:
 *                 type: boolean
 *                 description: Whether product is active
 *                 example: true
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
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *   delete:
 *     tags:
 *       - Admin - Product Management
 *     summary: Delete product
 *     description: Removes a product from the system
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
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/categories:
 *   post:
 *     tags:
 *       - Categories
 *     summary: Create new category
 *     description: Creates a new product category
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
 *                 description: Category name
 *                 example: "Electronics"
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
 *                 message:
 *                   type: string
 *                   example: "Category created successfully"
 *       400:
 *         description: Category name required or already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Category name is required"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     tags:
 *       - Categories
 *     summary: Update category
 *     description: Updates an existing category name
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
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
 *                 description: New category name
 *                 example: "Updated Electronics"
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
 *       400:
 *         description: Category name required or already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *   delete:
 *     tags:
 *       - Categories
 *     summary: Delete category
 *     description: Removes a category from the system
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
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
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     tags:
 *       - Sales
 *     summary: Get single sale details
 *     description: Returns detailed information about a specific sale. Sellers can only access their own sales.
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
 *                   allOf:
 *                     - $ref: '#/components/schemas/Sale'
 *                     - type: object
 *                       properties:
 *                         sellerId:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             username:
 *                               type: string
 *                             firstName:
 *                               type: string
 *                             lastName:
 *                               type: string
 *                         productId:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             price:
 *                               type: number
 *                             image:
 *                               type: string
 *       403:
 *         description: Access denied (sellers can only see their own sales)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Access denied"
 *       404:
 *         description: Sale not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /api/reports:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Get sales reports
 *     description: Returns sales reports with filtering options. Sellers see only their own reports, admins can see all or filter by seller.
 *     security:
 *       - TelegramAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: number
 *         description: Report year
 *         example: 2024
 *       - in: query
 *         name: month
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 12
 *         description: Report month (1-12)
 *         example: 12
 *       - in: query
 *         name: sellerId
 *         schema:
 *           type: string
 *         description: Seller ID filter (admin only)
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reports:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       period:
 *                         type: object
 *                         properties:
 *                           startDate:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-12-01T00:00:00.000Z"
 *                           endDate:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-12-31T23:59:59.999Z"
 *                           year:
 *                             type: number
 *                             example: 2024
 *                           month:
 *                             type: number
 *                             example: 12
 *                       summary:
 *                         type: object
 *                         properties:
 *                           totalSales:
 *                             type: number
 *                             description: Total number of sales
 *                             example: 150
 *                           totalRevenue:
 *                             type: number
 *                             description: Total revenue amount
 *                             example: 45000000
 *                           totalQuantity:
 *                             type: number
 *                             description: Total quantity sold
 *                             example: 500
 *                       sales:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/Sale'
 *                         description: Detailed sales data
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
