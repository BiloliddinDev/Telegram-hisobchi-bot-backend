require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const Sale = require("./models/Sale");
const Customer = require("./models/Customer");

const MONGO_URI = process.env.MONGO_URI;

async function migrateOldSales() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log("🚀 MongoDB-ga ulanish muvaffaqiyatli!");
    console.log("🛠 Migratsiya boshlandi...");

    // 1. Faqat orderId-si yo'q yoki customer ulanmagan sotuvlar
    const sales = await Sale.find({
      $or: [
        { orderId: { $exists: false } },
        { orderId: null },
        { customer: { $exists: false } },
        { customer: null },
      ],
    }).sort({ createdAt: 1 });

    console.log(`📦 ${sales.length} ta eski sotuv topildi.`);

    if (sales.length === 0) {
      console.log("✅ Migratsiya qilinadigan ma'lumot qolmadi.");
      await mongoose.disconnect();
      process.exit(0);
    }

    let updated = 0;
    let created = 0;

    for (let sale of sales) {
      // 2. Telefon va ism normalizatsiya
      let searchPhone =
        sale.customerPhone &&
          sale.customerPhone.trim() !== "" &&
          sale.customerPhone.trim() !== "+998"
          ? sale.customerPhone.trim()
          : "NOMALUM";

      let searchName =
        sale.customerName && sale.customerName.trim() !== ""
          ? sale.customerName.trim()
          : "Noma'lum Mijoz";

      // 3. Mijozni qidirish
      let customer = await Customer.findOne({
        seller: sale.seller,
        phone: searchPhone,
      });

      // 4. Topilmasa yaratish
      if (!customer) {
        [customer] = await Customer.create([
          {
            seller: sale.seller,
            name: searchName,
            phone: searchPhone,
            totalDebt: 0,
          },
        ]);
        created++;
        console.log(`👤 Yangi profil: ${searchName} (${searchPhone})`);
      }

      // 5. OrderId yaratish
      const dateObj = new Date(sale.createdAt || sale.timestamp);
      const timeKey = dateObj.toISOString().substring(0, 16);
      const orderId = `OLD-ORD-${searchPhone}-${timeKey.replace(/[:T-]/g, "")}`;

      // 6. Sotuvni yangilash
      await Sale.findByIdAndUpdate(sale._id, {
        customer: customer._id,
        orderId: orderId,
        customerName: searchName,
        customerPhone: searchPhone,
      });

      updated++;
    }

    console.log(
      `✅ ${updated} ta sotuv yangilandi, ${created} ta yangi mijoz yaratildi.`,
    );

    // 7. Mijozlar qarzini qayta hisoblash
    console.log("🔢 Mijozlar balansi qayta hisoblanmoqda...");
    const allCustomers = await Customer.find({});

    for (let cust of allCustomers) {
      // debt field dan hisoblaymiz (debtAmount emas)
      const debtSales = await Sale.find({
        customer: cust._id,
        debt: { $gt: 0 },
      });

      const actualDebt = debtSales.reduce((sum, s) => sum + (s.debt || 0), 0);
      const roundedDebt = Number(actualDebt.toFixed(2));

      if (cust.totalDebt !== roundedDebt) {
        await Customer.findByIdAndUpdate(cust._id, {
          totalDebt: roundedDebt,
        });
        console.log(`💰 ${cust.name}: qarz ${cust.totalDebt} → ${roundedDebt}`);
      }
    }

    console.log("✅ Migratsiya muvaffaqiyatli yakunlandi!");
  } catch (err) {
    console.error("❌ Xatolik yuz berdi:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Baza bilan aloqa uzildi.");
    process.exit(0);
  }
}

migrateOldSales();
