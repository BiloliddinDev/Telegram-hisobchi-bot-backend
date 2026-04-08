const SaleService = require("../utils/saleService");
const Customer = require("../models/Customer");

class ReportDTO {
  constructor(
    sales,
    products = [],
    sellerStocks = [],
    startDate,
    endDate,
    debts = {},
  ) {
    this.period = { startDate, endDate };
    this.summary = this._calculateSummary(sales, products, sellerStocks);
    this.debts = debts;
  }

  _calculateSummary(sales, products, sellerStocks) {
    // 1. Asosiy Ombor statistikasi
    const totalProducts = products.length;
    const totalProductQuantity = products.reduce(
      (sum, p) => sum + (p.warehouseQuantity || 0),
      0,
    );
    const totalProductCostPrice = products.reduce(
      (sum, p) => sum + (p.warehouseQuantity || 0) * (p.costPrice || 0),
      0,
    );

    // 2. Sotuvchilardagi qoldiq statistikasi
    const totalSellerStocks = sellerStocks.length;
    const totalSellerStockQuantity = sellerStocks.reduce(
      (sum, s) => sum + (s.stock?.quantity || 0),
      0,
    );
    const totalSellerStockCostPrice = sellerStocks.reduce(
      (sum, s) => sum + (s.stock?.quantity || 0) * (s.product?.costPrice || 0),
      0,
    );

    // 3. Savdo statistikasi — qaytarilganlarni chiqarib tashlash
    const totalReturned = sales.filter((s) => s.status === "returned").length;
    const activeSales = sales.filter((s) => s.status !== "returned");

    const totalSales = activeSales.length;
    const totalSalesQuantity = activeSales.reduce(
      (sum, sale) => sum + (sale.quantity || 0),
      0,
    );

    // Jami sotuv (qarz + naqd) — faqat aktiv sotuvlar
    const totalRevenueCents = activeSales.reduce(
      (sum, sale) => sum + SaleService.toCents(sale.totalAmount || 0),
      0,
    );

    // Naqd tushum (qo'lda bor pul)
    const totalPaidCents = activeSales.reduce(
      (sum, sale) => sum + SaleService.toCents(sale.paidAmount || 0),
      0,
    );

    // Qarzlar (hali olinmagan)
    const totalDebtCents = activeSales.reduce(
      (sum, sale) => sum + SaleService.toCents(sale.debt || 0),
      0,
    );

    // Tan narx — faqat sale.costPrice > 0 bo'lsa
    const totalSoldCostCents = activeSales.reduce((sum, sale) => {
      const costPrice = sale.costPrice > 0 ? sale.costPrice : 0;
      return sum + SaleService.toCents((sale.quantity || 0) * costPrice);
    }, 0);

    // Sof foyda = Naqd tushum - Tan narx
    const totalProfitCents = totalPaidCents - totalSoldCostCents;

    const uniqueSellers = new Set(
      activeSales.map((s) => s.seller?._id?.toString()).filter(Boolean),
    );
    const uniqueProducts = new Set(
      activeSales.map((s) => s.product?._id?.toString()).filter(Boolean),
    );

    const totalRevenue = SaleService.toDollar(totalRevenueCents);
    const totalPaid = SaleService.toDollar(totalPaidCents);
    const totalDebt = SaleService.toDollar(totalDebtCents);
    const totalProfit = SaleService.toDollar(totalProfitCents);

    const averageSaleAmount =
      totalSales > 0
        ? SaleService.toDollar(Math.round(totalRevenueCents / totalSales))
        : 0;

    const debtRatio =
      totalRevenueCents > 0
        ? ((totalDebtCents / totalRevenueCents) * 100).toFixed(2) + "%"
        : "0%";

    return {
      products: {
        totalProducts,
        totalProductQuantity,
        totalProductCostPrice,
      },
      sellerStocks: {
        totalSellerStocks,
        totalSellerStockQuantity,
        totalSellerStockCostPrice,
      },
      sales: {
        totalSales,
        totalReturned,
        totalRevenue,
        totalPaid,
        totalDebt,
        totalProfit,
        debtRatio,
        totalSalesQuantity,
        totalSellers: uniqueSellers.size,
        totalProductsSold: uniqueProducts.size,
        averageSaleAmount,
      },
    };
  }

  static async create(sales, products, sellerStocks, startDate, endDate) {
    const customers = await Customer.find({ totalDebt: { $gt: 0 } })
      .populate("seller", "username firstName lastName")
      .sort({ totalDebt: -1 });

    const sellerDebtsMap = {};
    for (const customer of customers) {
      const sellerId = customer.seller?._id?.toString();
      if (!sellerId) continue;

      if (!sellerDebtsMap[sellerId]) {
        sellerDebtsMap[sellerId] = {
          seller: customer.seller,
          totalDebt: 0,
          customersCount: 0,
          customers: [],
        };
      }

      sellerDebtsMap[sellerId].totalDebt = SaleService.toDollar(
        SaleService.toCents(sellerDebtsMap[sellerId].totalDebt) +
        SaleService.toCents(customer.totalDebt),
      );
      sellerDebtsMap[sellerId].customersCount += 1;
      sellerDebtsMap[sellerId].customers.push({
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        totalDebt: customer.totalDebt,
        lastPurchase: customer.lastPurchase,
      });
    }

    const grandTotalDebtCents = customers.reduce(
      (sum, c) => sum + SaleService.toCents(c.totalDebt),
      0,
    );

    const debts = {
      grandTotalDebt: SaleService.toDollar(grandTotalDebtCents),
      totalDebtors: customers.length,
      sellerDebts: Object.values(sellerDebtsMap).sort(
        (a, b) => b.totalDebt - a.totalDebt,
      ),
    };

    return new ReportDTO(
      sales,
      products,
      sellerStocks,
      startDate,
      endDate,
      debts,
    );
  }

  toJSON() {
    return {
      period: this.period,
      summary: this.summary,
      debts: this.debts,
    };
  }
}

module.exports = ReportDTO;
