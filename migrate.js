const mongoose = require("mongoose");
const Sale = require("./models/Sale");
const Customer = require("./models/Customer");

// 1. MONGO_URI ni o'zgartiring (masalan: .env dagi linkni qo'ying)
const MONGO_URI = "mongodb://127.0.0.1:27017/Sening_Baza_Noming";

async function migrateOldSales() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("🚀 MongoDB-ga ulanish muvaffaqiyatli!");
    console.log("🛠 Migratsiya boshlandi...");

    // 2. Faqat orderId-si bo'lmagan yoki customer ulanmagan sotuvlarni topamiz
    const sales = await Sale.find({
      $or: [{ orderId: { $exists: false } }, { customer: { $exists: false } }],
    }).sort({ createdAt: 1 });

    console.log(`📦 ${sales.length} ta eski sotuv topildi.`);

    if (sales.length === 0) {
      console.log("✅ Migratsiya qilinadigan ma'lumot qolmadi.");
      process.exit();
    }

    for (let sale of sales) {
      // 3. Ma'lumotlarni tozalash (Normalizatsiya)
      // Agar telefon yoki ism bo'lmasa, bitta "NOMALUM" profiliga yig'amiz
      let searchPhone =
        sale.customerPhone && sale.customerPhone.trim() !== ""
          ? sale.customerPhone.trim()
          : "NOMALUM";

      let searchName =
        sale.customerName && sale.customerName.trim() !== ""
          ? sale.customerName.trim()
          : "Noma'lum Mijoz";

      // 4. Mijozni qidirish (Avval mavjudmi tekshiramiz)
      let customer = await Customer.findOne({
        seller: sale.seller,
        phone: searchPhone,
      });

      // 5. Agar topilmasa, yangi yaratamiz
      if (!customer) {
        [customer] = await Customer.create([
          {
            seller: sale.seller,
            name: searchName,
            phone: searchPhone,
            totalDebt: 0,
          },
        ]);
        console.log(`👤 Yangi profil ochildi: ${searchName} (${searchPhone})`);
      }

      // 6. Savat ID (OrderId) yaratish
      // Vaqti bir xil bo'lganlarni (minutigacha) bitta ID ga solamiz
      const dateObj = new Date(sale.createdAt || sale.timestamp);
      const timeKey = dateObj.toISOString().substring(0, 16);
      const orderId = `OLD-ORD-${searchPhone}-${timeKey.replace(/[:T-]/g, "")}`;

      // 7. Sotuvni yangi tizimga bog'lash
      await Sale.findByIdAndUpdate(sale._id, {
        customer: customer._id,
        orderId: orderId,
        customerName: searchName, // Eskisini yangilangan bilan to'g'rilab qo'yamiz
        customerPhone: searchPhone,
      });
    }

    // 8. QAYTA HISOBLASH: Har bir mijozning qarzini Sale jadvalidan to'g'irlab chiqish
    console.log("🔢 Mijozlar balansi qayta hisoblanmoqda...");
    const allCustomers = await Customer.find({});

    for (let cust of allCustomers) {
      const stats = await Sale.aggregate([
        { $match: { customer: cust._id, isDebt: true } },
        { $group: { _id: null, totalDebt: { $sum: "$debtAmount" } } },
      ]);

      const actualDebt = stats.length > 0 ? stats[0].totalDebt : 0;

      // Faqat o'zgargan bo'lsa saqlaymiz
      if (cust.totalDebt !== actualDebt) {
        cust.totalDebt = actualDebt;
        await cust.save();
      }
    }

    console.log("✅ Migratsiya muvaffaqiyatli yakunlandi!");
  } catch (err) {
    console.error("❌ Xatolik yuz berdi:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Baza bilan aloqa uzildi.");
    process.exit();
  }
}

migrateOldSales();
