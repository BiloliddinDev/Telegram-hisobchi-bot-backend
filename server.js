require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const initializeAdmin = require("./utils/initAdmin");

const PORT = process.env.PORT || 5000;
const NODE_ENV = (process.env.NODE_ENV || "development").trim();

(async () => {
  await connectDB();

  // Load Telegram bot only in production
  if (NODE_ENV === "production") {
    console.log("🤖 Loading Telegram bot for production environment...");
    require("./bot/telegram");
  } else {
    await initializeAdmin();
    console.log("🔧 Development mode: Telegram bot disabled");
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Environment: ${NODE_ENV}`);
    console.log(
      `🤖 Telegram bot: ${NODE_ENV === "production" ? "ENABLED" : "DISABLED"}`,
    );
  });
})();

// require("dotenv").config();
// const app = require("./app");
// const connectDB = require("./config/db");
// const initializeAdmin = require("./utils/initAdmin");
// const Sale = require("./models/Sale");
// const Customer = require("./models/Customer");

// const PORT = process.env.PORT || 5000;
// const NODE_ENV = (process.env.NODE_ENV || "development").trim();

// async function migrateOldSales() {
//   try {
//     console.log("🛠 Migratsiya tekshirilmoqda...");

//     const sales = await Sale.find({
//       $or: [
//         { orderId: { $exists: false } },
//         { orderId: null },
//         { customer: { $exists: false } },
//         { customer: null },
//       ],
//     }).sort({ createdAt: 1 });

//     if (sales.length === 0) {
//       console.log("✅ Migratsiya kerak emas.");
//       return;
//     }

//     console.log(
//       `📦 ${sales.length} ta eski sotuv topildi, migratsiya boshlandi...`,
//     );

//     let updated = 0;
//     let created = 0;

//     for (let sale of sales) {
//       let searchPhone =
//         sale.customerPhone &&
//         sale.customerPhone.trim() !== "" &&
//         sale.customerPhone.trim() !== "+998"
//           ? sale.customerPhone.trim()
//           : "NOMALUM";

//       let searchName =
//         sale.customerName && sale.customerName.trim() !== ""
//           ? sale.customerName.trim()
//           : "Noma'lum Mijoz";

//       let customer = await Customer.findOne({
//         seller: sale.seller,
//         phone: searchPhone,
//       });

//       if (!customer) {
//         [customer] = await Customer.create([
//           {
//             seller: sale.seller,
//             name: searchName,
//             phone: searchPhone,
//             totalDebt: 0,
//           },
//         ]);
//         created++;
//         console.log(`👤 Yangi profil: ${searchName} (${searchPhone})`);
//       }

//       const dateObj = new Date(sale.createdAt || sale.timestamp);
//       const timeKey = dateObj.toISOString().substring(0, 16);
//       const orderId = `OLD-ORD-${searchPhone}-${timeKey.replace(/[:T-]/g, "")}`;

//       await Sale.findByIdAndUpdate(sale._id, {
//         customer: customer._id,
//         orderId: orderId,
//         customerName: searchName,
//         customerPhone: searchPhone,
//       });

//       updated++;
//     }

//     console.log(
//       `✅ ${updated} ta sotuv yangilandi, ${created} ta yangi mijoz yaratildi.`,
//     );

//     // Mijozlar qarzini qayta hisoblash
//     console.log("🔢 Mijozlar balansi qayta hisoblanmoqda...");
//     const allCustomers = await Customer.find({});

//     for (let cust of allCustomers) {
//       const debtSales = await Sale.find({
//         customer: cust._id,
//         debt: { $gt: 0 },
//       });
//       const actualDebt = Number(
//         debtSales.reduce((sum, s) => sum + (s.debt || 0), 0).toFixed(2),
//       );

//       if (cust.totalDebt !== actualDebt) {
//         await Customer.findByIdAndUpdate(cust._id, { totalDebt: actualDebt });
//         console.log(`💰 ${cust.name}: ${cust.totalDebt} → ${actualDebt}`);
//       }
//     }

//     console.log("🎉 Migratsiya muvaffaqiyatli yakunlandi!");
//   } catch (err) {
//     console.error("❌ Migratsiya xatolik:", err.message);
//   }
// }

// (async () => {
//   await connectDB();

//   // ✅ Migratsiya — DB ga ulangandan keyin ishga tushadi
//   await migrateOldSales();

//   if (NODE_ENV === "production") {
//     console.log("🤖 Loading Telegram bot for production environment...");
//     require("./bot/telegram");
//   } else {
//     await initializeAdmin();
//     console.log("🔧 Development mode: Telegram bot disabled");
//   }

//   app.listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
//     console.log(`📱 Environment: ${NODE_ENV}`);
//     console.log(
//       `🤖 Telegram bot: ${NODE_ENV === "production" ? "ENABLED" : "DISABLED"}`,
//     );
//   });
// })();
