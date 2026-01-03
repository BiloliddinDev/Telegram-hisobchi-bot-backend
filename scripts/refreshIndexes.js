const mongoose = require("mongoose");
require("dotenv").config();

async function refreshIndexes() {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/test";
    await mongoose.connect(mongoUri);
    console.log("MongoDB-ga ulanish muvaffaqiyatli");

    const User = mongoose.model(
      "User",
      new mongoose.Schema({
        telegramId: { type: String, unique: true, sparse: true },
        phoneNumber: { type: String, unique: true, sparse: true },
      }),
    );

    console.log("Mavjud indekslarni o'chirish...");
    try {
      await User.collection.dropIndex("telegramId_1");
      console.log("telegramId_1 indeksi o'chirildi");
    } catch (e) {
      console.log("telegramId_1 indeksi topilmadi yoki allaqachon o'chirilgan");
    }

    try {
      await User.collection.dropIndex("phoneNumber_1");
      console.log("phoneNumber_1 indeksi o'chirildi");
    } catch (e) {
      console.log(
        "phoneNumber_1 indeksi topilmadi yoki allaqachon o'chirilgan",
      );
    }

    console.log("Yangi sparse indekslarni yaratish...");
    await User.collection.createIndex(
      { telegramId: 1 },
      { unique: true, sparse: true },
    );
    await User.collection.createIndex(
      { phoneNumber: 1 },
      { unique: true, sparse: true },
    );

    console.log("Indekslar muvaffaqiyatli qayta yaratildi");
    process.exit(0);
  } catch (error) {
    console.error("Xatolik:", error);
    process.exit(1);
  }
}

refreshIndexes();
