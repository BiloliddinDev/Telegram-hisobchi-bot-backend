class SaleService {
  // ✅ Dollar → Sent (hisoblash uchun)
  static toCents(dollar) {
    return Math.round(Number(dollar) * 100);
  }

  // ✅ Sent → Dollar (response uchun)
  static toDollar(cents) {
    return Number((cents / 100).toFixed(2));
  }

  // 1. Jami summalarni hisoblash
  static calculateTotals({ items, discountPercent }) {
    // Barcha hisob SENTDA
    const rawTotalCents = items.reduce((sum, item) => {
      return sum + this.toCents(item.price) * item.quantity;
    }, 0);

    const discountCents = Math.round(
      rawTotalCents * ((discountPercent || 0) / 100),
    );

    const netTotalCents = rawTotalCents - discountCents;

    return {
      rawTotal: this.toDollar(rawTotalCents),
      discountAmount: this.toDollar(discountCents),
      netTotal: this.toDollar(netTotalCents),
      // Internal hisob uchun
      _cents: { rawTotalCents, discountCents, netTotalCents },
    };
  }

  // 2. Status va qarz hisoblash
  static calculateStatus({ netTotal, paidAmount }) {
    const netCents = this.toCents(netTotal);
    const paidCents = this.toCents(paidAmount);

    const debtCents = Math.max(0, netCents - paidCents);
    const debt = this.toDollar(debtCents);

    const status =
      debtCents === 0 ? "paid" : paidCents === 0 ? "debt" : "partial";

    return { debt, status };
  }

  // 3. To'lovni itemlarga taqsimlash
  static distributePayment({ items, discountPercent, paid, rawTotal }) {
    const paidCents = this.toCents(paid);
    const rawTotalCents = this.toCents(rawTotal);

    let remainingPaidCents = paidCents;

    return items.map((item, index) => {
      const isLast = index === items.length - 1;

      const itemRawCents = this.toCents(item.price) * item.quantity;
      const itemDiscountCents = Math.round(
        itemRawCents * ((discountPercent || 0) / 100),
      );
      const itemNetCents = itemRawCents - itemDiscountCents;

      // Oxirgi itemga qolgan hamma narsani ber (yaxlitlash xatosini oldini olish)
      const itemPaidCents = isLast
        ? remainingPaidCents
        : Math.round((paidCents * itemRawCents) / rawTotalCents);

      remainingPaidCents -= itemPaidCents;

      const itemDebtCents = Math.max(0, itemNetCents - itemPaidCents);

      return {
        ...item,
        itemRaw: this.toDollar(itemRawCents),
        itemNet: this.toDollar(itemNetCents),
        itemPaid: this.toDollar(itemPaidCents),
        itemDebt: this.toDollar(itemDebtCents),
      };
    });
  }
}

module.exports = SaleService;
