const User = require("../models/User");

const authenticate = async (req, res, next) => {
  try {
    const telegramId = req.headers["x-telegram-id"];
    console.log(`Incoming ID: [${telegramId}]`);
    const initData = req.headers["x-telegram-init-data"];

    if (!telegramId) {
      return res.status(401).json({ error: "Telegram ID is required" });
    }

    let telegramUser = null;
    if (initData) {
      try {
        const params = new URLSearchParams(initData);
        const userStr = params.get("user");
        if (userStr) {
          telegramUser = JSON.parse(decodeURIComponent(userStr));
        }
      } catch (e) {
        console.error("Error parsing initData in middleware:", e);
      }
    }

    let user = await User.findOne({ telegramId: telegramId });

    if (!user) {
      console.log(`Incoming ID: [${telegramId}]`);
      // Admin bo'lsa va hali bazada bo'lmasa, yaratishga ruxsat berish mumkin (ixtiyoriy)
      if (telegramId === process.env.ADMIN_ID) {
        console.log("Creating admin user...");
        user = await User.create({
          telegramId,
          firstName: telegramUser?.first_name || "Admin",
          username: telegramUser?.username || "admin",
          role: "admin",
        });
      } else {
        console.log("Unauthorized: User not in DB");
        return res.status(401).json({
          error: "Siz ro'yxatdan o'tmagansiz",
          message: "Iltimos, avval bot orqali ro'yxatdan o'ting.",
        });
      }
    } else {
      if (!user.isActive || user.isDeleted) {
        return res
          .status(403)
          .json({ error: "Access denied. User is inactive." });
      }
      // Update existing user info from Telegram if available
      let updated = false;
      if (telegramUser) {
        if (!user.telegramId) {
          user.telegramId = telegramId;
          updated = true;
        }
        if (telegramUser.username && user.username !== telegramUser.username) {
          user.username = telegramUser.username;
          updated = true;
        }
        if (
          telegramUser.photo_url &&
          user.avatarUrl !== telegramUser.photo_url
        ) {
          user.avatarUrl = telegramUser.photo_url;
          updated = true;
        }
        // Faqat admin kiritmagan bo'lsa yoki bo'sh bo'lsa yangilaymiz
        if (telegramUser.first_name && !user.firstName) {
          user.firstName = telegramUser.first_name;
          updated = true;
        }
        if (telegramUser.last_name && !user.lastName) {
          user.lastName = telegramUser.last_name;
          updated = true;
        }
      }

      if (updated) {
        await user.save();
      }
    }

    req.user = user;
    next();
  } catch (error) {
    res
      .status(500)
      .json({ error: "Authentication failed", message: error.message });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin role required." });
  }
  next();
};

const isSeller = (req, res, next) => {
  if (req.user.role !== "seller") {
    return res
      .status(403)
      .json({ error: "Access denied. Seller role required." });
  }
  next();
};

module.exports = { authenticate, isAdmin, isSeller };
