const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const TelegramBot = require("node-telegram-bot-api");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    "https://telegram-hisobchi-bot-frontend.vercel.app",
    "https://telegram-web-app-sand.vercel.app"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-telegram-id", "x-telegram-init-data"]
}));
app.use(express.json());

const connectDB = async () => {
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

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
console.log("🤖 Bot polling rejimida ishga tushdi...");

const User = require("./models/User");
const FRONTEND_URL = process.env.FRONTEND_URL || "https://telegram-hisobchi-bot-frontend.vercel.app";

const normalizePhone = (phone) => {
    let cleaned = phone.replace(/\D/g, "");
    return cleaned.startsWith("998") ? cleaned : "998" + cleaned;
};

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        await connectDB();
        const user = await User.findOne({ telegramId: chatId.toString() });

        if (user) {
            return bot.sendMessage(chatId, `Xush kelibsiz, ${user.firstName}!`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🛍 Web App-ni ochish", web_app: { url: FRONTEND_URL } }]
                    ]
                }
            });
        }

        bot.sendMessage(chatId, "Assalomu alaykum! Tizimdan foydalanish uchun telefon raqamingizni yuboring.", {
            reply_markup: {
                keyboard: [[{ text: "📱 Telefon raqamni yuborish", request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    } catch (error) {
        console.error("Start xatosi:", error);
    }
});

bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    try {
        await connectDB();
        if (msg.contact.user_id !== msg.from.id) {
            return bot.sendMessage(chatId, "Faqat o'z raqamingizni yuboring.");
        }

        const phoneNumber = normalizePhone(msg.contact.phone_number);
        const user = await User.findOne({
            $or: [{ phoneNumber: phoneNumber }, { phoneNumber: `+${phoneNumber}` }]
        });

        if (user) {
            user.telegramId = chatId.toString();
            user.username = msg.from.username || user.username;
            await user.save();

            bot.sendMessage(chatId, "✅ Muvaffaqiyatli bog'landi!", {
                reply_markup: {
                    inline_keyboard: [[{ text: "🛍 Web App-ni ochish", web_app: { url: FRONTEND_URL } }]]
                }
            });
        } else {
            bot.sendMessage(chatId, "❌ Kechirasiz, siz sotuvchilar ro'yxatida yo'qsiz. Admin bilan bog'laning.");
        }
    } catch (error) {
        console.error("Contact xatosi:", error);
    }
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/seller", require("./routes/seller"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/transfers", require("./routes/transfers"));

app.get("/api/health", (req, res) => res.json({ status: "OK" }));

app.listen(PORT, async () => {
    await connectDB();
    console.log(`🚀 Backend server ${PORT}-portda ishlamoqda...`);
});

module.exports = app;