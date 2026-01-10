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
