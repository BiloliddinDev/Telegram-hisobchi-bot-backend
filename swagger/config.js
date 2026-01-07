const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Telegram Hisobchi Bot API",
      version: "2.0.0",
      description:
        "API documentation for Telegram Hisobchi Bot Backend - Advanced Sales Management System with SellerStock Management",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || "http://localhost:5000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        TelegramAuth: {
          type: "apiKey",
          in: "header",
          name: "x-telegram-id",
          description:
            "Telegram user ID (REQUIRED for all authenticated endpoints)",
        },
      },
      schemas: {
        PaginatedResponse: {
          type: "object",
          properties: {
            totalDocs: { type: "integer", example: 100 },
            limit: { type: "integer", example: 10 },
            totalPages: { type: "integer", example: 10 },
            page: { type: "integer", example: 1 },
            pagingCounter: { type: "integer", example: 1 },
            hasPrevPage: { type: "boolean", example: false },
            hasNextPage: { type: "boolean", example: true },
            prevPage: { type: "integer", nullable: true, example: null },
            nextPage: { type: "integer", nullable: true, example: 2 },
          },
        },
        ProductPagination: {
          type: "object",
          properties: {
            products: {
              allOf: [
                { $ref: "#/components/schemas/PaginatedResponse" },
                {
                  type: "object",
                  properties: {
                    docs: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Product" },
                    },
                  },
                },
              ],
            },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "User ID",
            },
            telegramId: {
              type: "string",
              description: "Telegram user ID",
            },
            username: {
              type: "string",
              description: "Username",
            },
            firstName: {
              type: "string",
              description: "First name",
            },
            lastName: {
              type: "string",
              description: "Last name",
            },
            phoneNumber: {
              type: "string",
              description: "Phone number",
            },
            role: {
              type: "string",
              enum: ["admin", "seller"],
              description: "User role",
            },
            isActive: {
              type: "boolean",
              description: "User active status",
            },
          },
        },
        UserPublic: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "User ID",
            },
            username: {
              type: "string",
              description: "Username",
            },
            firstName: {
              type: "string",
              description: "First name",
            },
            lastName: {
              type: "string",
              description: "Last name",
            },
          },
        },
        Category: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Category ID",
            },
            name: {
              type: "string",
              description: "Category name",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Category creation date",
            },
          },
        },
        Product: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Product ID",
            },
            name: {
              type: "string",
              description: "Product name",
            },
            description: {
              type: "string",
              description: "Product description",
            },
            price: {
              type: "number",
              description: "Selling price",
            },
            costPrice: {
              type: "number",
              description: "Cost price",
            },
            category: {
              type: "object",
              $ref: "#/components/schemas/Category",
              description: "Product category",
            },
            warehouseQuantity: {
              type: "number",
              description: "Warehouse stock count",
            },
            image: {
              type: "string",
              description: "Product image URL",
            },
            sku: {
              type: "string",
              description: "Stock Keeping Unit",
            },
            color: {
              type: "string",
              description: "Product color",
            },
            isActive: {
              type: "boolean",
              description: "Product active status",
            },
          },
        },
        SellerProduct: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "SellerStock ID",
            },
            seller: {
              type: "object",
              $ref: "#/components/schemas/UserPublic",
            },
            product: {
              type: "object",
              $ref: "#/components/schemas/Product",
            },
            quantity: {
              type: "number",
              description: "Stock quantity with seller",
              minimum: 0,
            },
            lastTransferDate: {
              type: "string",
              format: "date-time",
              description: "Date of last transfer",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation date",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update date",
            },
          },
        },
        SellerStock: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Seller stock ID",
            },
            seller: {
              type: "object",
              $ref: "#/components/schemas/UserPublic",
            },
            product: {
              type: "object",
              $ref: "#/components/schemas/Product",
            },
            quantity: {
              type: "number",
              description: "Stock quantity with seller",
            },
            lastTransferDate: {
              type: "string",
              format: "date-time",
              description: "Date of last transfer",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation date",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update date",
            },
          },
        },
        Sale: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Sale ID",
            },
            seller: {
              type: "object",
              $ref: "#/components/schemas/UserPublic",
            },
            product: {
              type: "object",
              $ref: "#/components/schemas/Product",
            },
            quantity: {
              type: "number",
              description: "Quantity sold",
            },
            price: {
              type: "number",
              description: "Price per unit",
            },
            totalAmount: {
              type: "number",
              description: "Total sale amount",
            },
            customerName: {
              type: "string",
              description: "Customer name",
            },
            customerPhone: {
              type: "string",
              description: "Customer phone number",
            },
            notes: {
              type: "string",
              description: "Additional notes",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Sale timestamp",
            },
          },
        },
        Transfer: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Transfer ID",
            },
            seller: {
              type: "object",
              $ref: "#/components/schemas/UserPublic",
            },
            product: {
              type: "object",
              $ref: "#/components/schemas/Product",
            },
            quantity: {
              type: "number",
              description: "Transferred quantity",
            },
            type: {
              type: "string",
              enum: ["transfer", "return"],
              description: "Transfer type",
            },
            status: {
              type: "string",
              enum: ["active", "cancelled"],
              description: "Transfer status",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Transfer creation date",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Success message",
            },
          },
        },
        Report: {
          type: "object",
          properties: {
            period: {
              type: "object",
              properties: {
                startDate: {
                  type: "string",
                  format: "date-time",
                  description: "Report start date",
                },
                endDate: {
                  type: "string",
                  format: "date-time",
                  description: "Report end date",
                },
                year: {
                  type: "number",
                  description: "Report year",
                },
                month: {
                  type: "number",
                  description: "Report month (1-12)",
                },
                monthName: {
                  type: "string",
                  description: "Month name in English",
                },
              },
            },
            summary: {
              type: "object",
              properties: {
                totalSales: {
                  type: "number",
                  description: "Total number of sales",
                },
                totalRevenue: {
                  type: "string",
                  description: "Total revenue formatted as currency",
                },
                totalQuantity: {
                  type: "number",
                  description: "Total quantity sold",
                },
                totalSellers: {
                  type: "number",
                  description: "Number of unique sellers",
                },
                totalProducts: {
                  type: "number",
                  description: "Number of unique products",
                },
                averageSaleAmount: {
                  type: "string",
                  description: "Average sale amount formatted as currency",
                },
              },
            },
            salesBySeller: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  seller: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        description: "Seller ID",
                      },
                      username: {
                        type: "string",
                        description: "Seller username",
                      },
                      firstName: {
                        type: "string",
                        description: "Seller first name",
                      },
                      lastName: {
                        type: "string",
                        description: "Seller last name",
                      },
                      fullName: {
                        type: "string",
                        description: "Seller full name",
                      },
                    },
                  },
                  stats: {
                    type: "object",
                    properties: {
                      totalSales: {
                        type: "number",
                        description: "Number of sales by this seller",
                      },
                      totalRevenue: {
                        type: "string",
                        description: "Total revenue by this seller (formatted)",
                      },
                      totalQuantity: {
                        type: "number",
                        description: "Total quantity sold by this seller",
                      },
                      averageSaleAmount: {
                        type: "string",
                        description:
                          "Average sale amount by this seller (formatted)",
                      },
                    },
                  },
                },
              },
            },
            salesByProduct: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        description: "Product ID",
                      },
                      name: {
                        type: "string",
                        description: "Product name",
                      },
                      price: {
                        type: "string",
                        description: "Product price (formatted)",
                      },
                    },
                  },
                  stats: {
                    type: "object",
                    properties: {
                      totalSales: {
                        type: "number",
                        description: "Number of sales for this product",
                      },
                      totalRevenue: {
                        type: "string",
                        description:
                          "Total revenue for this product (formatted)",
                      },
                      totalQuantity: {
                        type: "number",
                        description: "Total quantity sold for this product",
                      },
                      averageSaleAmount: {
                        type: "string",
                        description:
                          "Average sale amount for this product (formatted)",
                      },
                    },
                  },
                },
              },
            },
            topPerformers: {
              type: "object",
              properties: {
                topSellerByRevenue: {
                  type: "object",
                  properties: {
                    seller: {
                      $ref: "#/components/schemas/User",
                    },
                    totalRevenue: {
                      type: "number",
                      description: "Total revenue amount",
                    },
                    totalSales: {
                      type: "number",
                      description: "Total number of sales",
                    },
                  },
                  nullable: true,
                },
                topProductByQuantity: {
                  type: "object",
                  properties: {
                    product: {
                      $ref: "#/components/schemas/Product",
                    },
                    totalQuantity: {
                      type: "number",
                      description: "Total quantity sold",
                    },
                    totalSales: {
                      type: "number",
                      description: "Total number of sales",
                    },
                  },
                  nullable: true,
                },
              },
            },
            dailySales: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: {
                    type: "string",
                    format: "date",
                    description: "Date in YYYY-MM-DD format",
                  },
                  totalSales: {
                    type: "number",
                    description: "Number of sales on this date",
                  },
                  totalRevenue: {
                    type: "string",
                    description: "Total revenue on this date (formatted)",
                  },
                  totalQuantity: {
                    type: "number",
                    description: "Total quantity sold on this date",
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        TelegramAuth: [],
      },
    ],
  },
  apis: [
    "./routes/*.js",
    "./swagger/paths/*.js",
    "./swagger/paths/missing-endpoints.js",
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
};
