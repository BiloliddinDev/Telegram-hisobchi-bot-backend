const TelegramBot = require("node-telegram-bot-api");
const User = require("../models/User");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
console.log("🤖 Bot polling rejimida ishga tushdi...");

const normalizePhone = (phone) => {
  let cleaned = phone.replace(/\D/g, "");
  return cleaned.startsWith("998") ? cleaned : "998" + cleaned;
};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const user = await User.findOne({ telegramId: chatId.toString() });

    if (user) {
      return bot.sendMessage(chatId, `Xush kelibsiz, ${user.firstName}!`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🛍 Web App-ni ochish", web_app: { url: FRONTEND_URL } }],
          ],
        },
      });
    }

    bot.sendMessage(
      chatId,
      "Assalomu alaykum! Tizimdan foydalanish uchun telefon raqamingizni yuboring.",
      {
        reply_markup: {
          keyboard: [
            [{ text: "📱 Telefon raqamni yuborish", request_contact: true }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      },
    );
  } catch (error) {
    console.error("Start xatosi:", error);
  }
});

bot.on("contact", async (msg) => {
  const chatId = msg.chat.id;
  try {
    if (msg.contact.user_id !== msg.from.id) {
      return bot.sendMessage(chatId, "Faqat o'z raqamingizni yuboring.");
    }

    const phoneNumber = normalizePhone(msg.contact.phone_number);
    const user = await User.findOne({
      $or: [{ phoneNumber: phoneNumber }, { phoneNumber: `+${phoneNumber}` }],
    });

    if (user) {
      user.telegramId = chatId.toString();
      user.username = msg.from.username || user.username;
      await user.save();

      bot.sendMessage(chatId, "✅ Muvaffaqiyatli bog'landi!", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🛍 Web App-ni ochish", web_app: { url: FRONTEND_URL } }],
          ],
        },
      });
    } else {
      bot.sendMessage(
        chatId,
        "❌ Kechirasiz, siz sotuvchilar ro'yxatida yo'qsiz. Admin bilan bog'laning.",
      );
    }
  } catch (error) {
    console.error("Contact xatosi:", error);
  }
});

module.exports = bot;
