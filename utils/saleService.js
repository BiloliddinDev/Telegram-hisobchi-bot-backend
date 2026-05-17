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

  // 3. Order statusini aggregatsiyadan hisoblash
  // Order ichidagi itemlar va jami summalar asosida to'g'ri statusni qaytaradi.
  // Status: "returned" (hammasi qaytarilgan) | "debt" | "partial" | "paid"
  static computeOrderStatus({ items, debt, paidAmount }) {
    if (!items || items.length === 0) return "paid";

    const allReturned = items.every((i) => i.status === "returned");
    if (allReturned) return "returned";

    const debtCents = this.toCents(debt || 0);
    if (debtCents === 0) return "paid";

    const paidCents = this.toCents(paidAmount || 0);
    return paidCents === 0 ? "debt" : "partial";
  }

  // 4. To'lovni itemlarga taqsimlash
  static distributePayment({ items, discountPercent, paid, rawTotal }) {
    const paidCents = this.toCents(paid);
    const rawTotalCents = this.toCents(rawTotal);
    
    // Umumiy chegirma va netto summani sentda hisoblab olamiz
    const totalDiscountCents = Math.round(rawTotalCents * ((discountPercent || 0) / 100));
    const totalNetCents = rawTotalCents - totalDiscountCents;

    let remainingPaidCents = paidCents;
    let remainingNetCents = totalNetCents;
    let remainingRawCents = rawTotalCents;

    return items.map((item, index) => {
      const isLast = index === items.length - 1;

      const itemRawCents = this.toCents(item.price) * item.quantity;
      
      // Item net summasini taqsimlash (yaxlitlash xatosini oldini olish uchun)
      let itemNetCents;
      if (isLast) {
        itemNetCents = remainingNetCents;
      } else {
        // Proportsional taqsimlash
        itemNetCents = Math.round((totalNetCents * itemRawCents) / rawTotalCents);
      }
      
      // To'lovni taqsimlash
      let itemPaidCents;
      if (isLast) {
        itemPaidCents = remainingPaidCents;
      } else {
        // Agar to'liq to'langan bo'lsa, itemni ham to'liq to'langan qilib ko'rsatish
        if (paidCents === totalNetCents) {
          itemPaidCents = itemNetCents;
        } else {
          itemPaidCents = Math.round((paidCents * itemRawCents) / rawTotalCents);
        }
      }

      // Limitlar: to'lov netto summadan yoki qolgan puldan oshib ketmasligi kerak
      itemPaidCents = Math.min(itemPaidCents, itemNetCents, remainingPaidCents);

      remainingPaidCents -= itemPaidCents;
      remainingNetCents -= itemNetCents;
      remainingRawCents -= itemRawCents;

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
