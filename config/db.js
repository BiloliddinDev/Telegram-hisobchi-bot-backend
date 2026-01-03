const mongoose = require("mongoose");

module.exports = async function connectDB() {
  try {
    mongoose.set("bufferCommands", false);
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ MongoDB muvaffaqiyatli ulandi.");
  } catch (err) {
    console.error("❌ DB ulanish xatosi:", err.message);
    process.exit(1);
  }
};
