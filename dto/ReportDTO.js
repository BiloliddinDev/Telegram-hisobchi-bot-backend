class ReportDTO {
  constructor(sales, startDate, endDate) {
    this.period = {
      startDate,
      endDate,
    };
    this.summary = this._calculateSummary(sales);
    this.salesBySeller = this._groupSalesBySeller(sales);
    this.salesByProduct = this._groupSalesByProduct(sales);
    this.topPerformers = this._getTopPerformers(sales);
    this.dailySales = this._getDailySales(sales, startDate, endDate);
  }

  _calculateSummary(sales, sellers, products) {
    return {
      totalSales: sales.length,
      totalRevenue: sales.reduce(
        (sum, sale) => sum + (sale.totalAmount || 0),
        0,
      ),
      totalSalesQuantity: sales.reduce(
        (sum, sale) => sum + (sale.quantity || 0),
        0,
      ),
      totalSellers: uniqueSellers.size,
      totalProducts: uniqueProducts.size,
      averageSaleAmount:
        sales.length > 0
          ? sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0) /
            sales.length
          : 0,
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
      stats.totalRevenue = stats.totalRevenue;
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
      stats.totalRevenue = stats.totalRevenue;
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

    // Format currency for daily sales
    Object.values(dailySales).forEach((day) => {
      day.totalRevenue = day.totalRevenue;
    });

    return Object.values(dailySales).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  // Static method to create DTO from sales data
  static create(sales, startDate, endDate) {
    return new ReportDTO(sales, startDate, endDate);
  }

  // Method to get a simplified version for API response
  toJSON() {
    return {
      period: this.period,
      summary: this.summary,
      salesBySeller: this.salesBySeller,
      salesByProduct: this.salesByProduct,
      topPerformers: this.topPerformers,
      dailySales: this.dailySales,
    };
  }
}

module.exports = ReportDTO;
