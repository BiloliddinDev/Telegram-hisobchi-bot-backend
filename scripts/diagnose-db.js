const mongoose = require("mongoose");
require("dotenv").config({ path: "./backend/.env" });
const CashTransaction = require("../models/CashTransaction");
const SaleService = require("../utils/saleService");

async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const stats = await CashTransaction.aggregate([
      {
        $group: {
          _id: { type: "$type", method: "$paymentMethod" },
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    console.log("--- CashTransaction Stats ---");
    let allInCash = 0, allInCard = 0, allOutCash = 0, allOutCard = 0;
    let allRashot = 0, allOylik = 0, allChiqim = 0;

    stats.forEach(s => {
      const { type, method } = s._id;
      const total = s.total;
      console.log(`${type} (${method || 'no-method'}): ${total}$ [Count: ${s.count}]`);

      if (type === "in") {
        if (method === "card") allInCard += total;
        else allInCash += total;
      } else if (type === "out") {
        if (method === "card") allOutCard += total;
        else allOutCash += total;
      } else if (type === "rashot") allRashot += total;
      else if (type === "oylik") allOylik += total;
      else if (type === "chiqim") allChiqim += total;
    });

    const cashBalance = allInCash - allOutCash;
    const cardBalance = allInCard - allOutCard;
    
    console.log("\n--- Calculated Balance (New Logic) ---");
    console.log(`Cash Balance: ${cashBalance.toFixed(2)}$`);
    console.log(`Card Balance: ${cardBalance.toFixed(2)}$`);
    console.log(`Total Balance: ${(cashBalance + cardBalance).toFixed(2)}$`);

    console.log("\n--- Admin Pocket Stats ---");
    const totalOut = allOutCash + allOutCard;
    const totalSpent = allRashot + allOylik + allChiqim;
    console.log(`Total Withdrawn: ${totalOut.toFixed(2)}$`);
    console.log(`Total Spent: ${totalSpent.toFixed(2)}$`);
    console.log(`Pocket Remainder: ${(totalOut - totalSpent).toFixed(2)}$`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Diagnosis failed:", error);
  }
}

diagnose();
