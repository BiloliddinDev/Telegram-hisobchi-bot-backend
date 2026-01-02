const formatCurrency = (amount) => {
  return new Intl.NumberFormat("uz-UZ", {
    style: "currency",
    currency: "UZS",
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const calculateMonthlyStats = (sales) => {
  const stats = {
    totalSales: sales.length,
    totalRevenue: 0,
    totalQuantity: 0,
    averageSale: 0,
  };

  sales.forEach((sale) => {
    stats.totalRevenue += sale.totalAmount || 0;
    stats.totalQuantity += sale.quantity || 0;
  });

  if (stats.totalSales > 0) {
    stats.averageSale = stats.totalRevenue / stats.totalSales;
  }

  return stats;
};

module.exports = {
  formatCurrency,
  formatDate,
  calculateMonthlyStats,
};

