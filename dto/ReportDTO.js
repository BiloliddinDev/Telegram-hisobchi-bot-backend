class ReportDTO {
  // product:
  //    totalProducts: total products in all warehouses
  //    totalProductQuantity: total quantity of all products in all warehouses
  //    totalProductCostPrice: total cost price of all products in all warehouses
  // sellerStocks:
  //    totalSellerStocks: total stocks of all sellers in all warehouses
  //    totalSellerStockQuantity: total quantity of all stocks of all sellers in all warehouses
  //    totalSellerStockCostPrice: total cost price of all stocks of all sellers in all warehouses
  // sales:
  //    totalSales: total sales in all warehouses
  //    totalRevenue: total revenue in all warehouses
  //    totalSalesQuantity: total quantity of all sales in all warehouses
  constructor(sales, startDate, endDate, products = [], sellerStocks = []) {
    this.period = {
      startDate,
      endDate,
    };
    this.summary = this._calculateSummary(sales, products, sellerStocks);
    // this.salesBySeller = this._groupSalesBySeller(sales);
    // this.salesByProduct = this._groupSalesByProduct(sales);
    // this.topPerformers = this._getTopPerformers(sales);
    // this.dailySales = this._getDailySales(sales, startDate, endDate);
  }

  _calculateSummary(sales, products, sellerStocks) {
    // Calculate product statistics
    const totalProducts = products.length;
    const totalProductQuantity = products.reduce(
      (sum, product) => sum + (product.warehouseQuantity || 0),
      0,
    );
    const totalProductCostPrice = products.reduce(
      (sum, product) =>
        sum + (product.warehouseQuantity || 0) * (product.costPrice || 0),
      0,
    );

    // Calculate seller stock statistics
    const totalSellerStocks = sellerStocks.length;
    const totalSellerStockQuantity = sellerStocks.reduce(
      (sum, stock) => sum + (stock.stock?.quantity || 0),
      0,
    );
    const totalSellerStockCostPrice = sellerStocks.reduce(
      (sum, stock) =>
        sum + (stock.stock?.quantity || 0) * (stock.product?.costPrice || 0),
      0,
    );

    // Calculate sales statistics
    const totalSales = sales.length;
    const totalRevenue = sales.reduce(
      (sum, sale) => sum + (sale.totalAmount || 0),
      0,
    );
    const totalSalesQuantity = sales.reduce(
      (sum, sale) => sum + (sale.quantity || 0),
      0,
    );

    // Get unique sellers and products from sales
    const uniqueSellers = new Set(
      sales.map((sale) => sale.seller?._id?.toString()).filter(Boolean),
    );
    const uniqueProductsInSales = new Set(
      sales.map((sale) => sale.product?._id?.toString()).filter(Boolean),
    );

    return {
      // Product statistics
      products: {
        totalProducts,
        totalProductQuantity,
        totalProductCostPrice,
      },
      // Seller stock statistics
      sellerStocks: {
        totalSellerStocks,
        totalSellerStockQuantity,
        totalSellerStockCostPrice,
      },
      // Sales statistics
      sales: {
        totalSales,
        totalRevenue,
        totalSalesQuantity,
        totalSellers: uniqueSellers.size,
        totalProductsSold: uniqueProductsInSales.size,
        averageSaleAmount: totalSales > 0 ? totalRevenue / totalSales : 0,
      },
    };
  }

  _groupSalesBySeller(sales) {
    const salesBySeller = {};

    sales.forEach((sale) => {
      if (!sale.sellerId?._id) return;

      const sellerId = sale.sellerId._id.toString();
      if (!salesBySeller[sellerId]) {
        salesBySeller[sellerId] = {
          seller: {
            id: sale.sellerId._id,
            username: sale.sellerId.username,
            firstName: sale.sellerId.firstName,
            lastName: sale.sellerId.lastName,
            fullName:
              `${sale.sellerId.firstName || ""} ${sale.sellerId.lastName || ""}`.trim(),
          },
          stats: {
            totalSales: 0,
            totalRevenue: 0,
            totalQuantity: 0,
            averageSaleAmount: 0,
          },
        };
      }

      salesBySeller[sellerId].stats.totalSales += 1;
      salesBySeller[sellerId].stats.totalRevenue += sale.totalAmount || 0;
      salesBySeller[sellerId].stats.totalQuantity += sale.quantity || 0;
    });

    // Calculate averages and format currency
    Object.values(salesBySeller).forEach((sellerData) => {
      const stats = sellerData.stats;
      stats.averageSaleAmount =
        stats.totalSales > 0 ? stats.totalRevenue / stats.totalSales : 0;
    });

    return Object.values(salesBySeller).sort(
      (a, b) => b.stats.totalRevenue - a.stats.totalRevenue,
    );
  }

  _groupSalesByProduct(sales) {
    const salesByProduct = {};

    sales.forEach((sale) => {
      if (!sale.productId?._id) return;

      const productId = sale.productId._id.toString();
      if (!salesByProduct[productId]) {
        salesByProduct[productId] = {
          product: {
            id: sale.productId._id,
            name: sale.productId.name,
            price: sale.productId.price || 0,
          },
          stats: {
            totalSales: 0,
            totalRevenue: 0,
            totalQuantity: 0,
            averageSaleAmount: 0,
          },
        };
      }

      salesByProduct[productId].stats.totalSales += 1;
      salesByProduct[productId].stats.totalRevenue += sale.totalAmount || 0;
      salesByProduct[productId].stats.totalQuantity += sale.quantity || 0;
    });

    // Calculate averages and format currency
    Object.values(salesByProduct).forEach((productData) => {
      const stats = productData.stats;
      stats.averageSaleAmount =
        stats.totalSales > 0 ? stats.totalRevenue / stats.totalSales : 0;
    });

    return Object.values(salesByProduct).sort(
      (a, b) => b.stats.totalRevenue - a.stats.totalRevenue,
    );
  }

  _getTopPerformers(sales) {
    const sellerStats = {};
    const productStats = {};

    sales.forEach((sale) => {
      // Top sellers by revenue
      if (sale.sellerId?._id) {
        const sellerId = sale.sellerId._id.toString();
        if (!sellerStats[sellerId]) {
          sellerStats[sellerId] = {
            seller: sale.sellerId,
            totalRevenue: 0,
            totalSales: 0,
          };
        }
        sellerStats[sellerId].totalRevenue += sale.totalAmount || 0;
        sellerStats[sellerId].totalSales += 1;
      }

      // Top products by quantity
      if (sale.productId?._id) {
        const productId = sale.productId._id.toString();
        if (!productStats[productId]) {
          productStats[productId] = {
            product: sale.productId,
            totalQuantity: 0,
            totalSales: 0,
          };
        }
        productStats[productId].totalQuantity += sale.quantity || 0;
        productStats[productId].totalSales += 1;
      }
    });

    return {
      topSellerByRevenue:
        Object.values(sellerStats).sort(
          (a, b) => b.totalRevenue - a.totalRevenue,
        )[0] || null,
      topProductByQuantity:
        Object.values(productStats).sort(
          (a, b) => b.totalQuantity - a.totalQuantity,
        )[0] || null,
    };
  }

  _getDailySales(sales, startDate, endDate) {
    const dailySales = {};
    const currentDate = new Date(startDate);

    // Initialize all days in the period
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split("T")[0];
      dailySales[dateKey] = {
        date: dateKey,
        totalSales: 0,
        totalRevenue: 0,
        totalQuantity: 0,
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Populate with actual sales data
    sales.forEach((sale) => {
      const saleDate = new Date(sale.timestamp).toISOString().split("T")[0];
      if (dailySales[saleDate]) {
        dailySales[saleDate].totalSales += 1;
        dailySales[saleDate].totalRevenue += sale.totalAmount || 0;
        dailySales[saleDate].totalQuantity += sale.quantity || 0;
      }
    });

    return Object.values(dailySales).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  // Static method to create DTO from sales data with products and seller stocks
  static async create(sales, startDate, endDate) {
    const Product = require("../models/Product");
    const { getAssignedStocks } = require("../routes/utils");

    // Fetch all products
    const products = await Product.find({});

    // Fetch all seller stocks (with active assignments)
    const sellerStocks = await getAssignedStocks(true);

    return new ReportDTO(sales, startDate, endDate, products, sellerStocks);
  }

  // Method to get a simplified version for API response
  toJSON() {
    return {
      period: this.period,
      summary: this.summary,
      // salesBySeller: this.salesBySeller,
      // salesByProduct: this.salesB?yProduct,
      // topPerformers: this.topPerformers,
      // dailySales: this.dailySales,
    };
  }
}

module.exports = ReportDTO;
