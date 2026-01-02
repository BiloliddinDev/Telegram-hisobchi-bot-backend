const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Product = require("../models/Product"); // Ensure Product model is registered for populate
const { authenticate } = require("../middleware/auth");

// Get current user info
router.get("/me", authenticate, async (req, res) => {
  try {
    console.log("Fetching user for ID:", req.user._id);
    const user = await User.findById(req.user._id)
      .populate("assignedProducts", "name price description image")
      .select("-__v");

    if (!user) {
      console.log("User not found in DB for ID:", req.user._id);
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    console.log("User found:", user.username || user.firstName);
    res.json({ user });
  } catch (error) {
    console.error("Error in /auth/me:", error);
    res.status(500).json({ error: error.message || "Server xatosi", stack: error.stack });
  }
});

// Update user info
router.put("/me", authenticate, async (req, res) => {
  try {
    const { username, firstName, lastName } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { username, firstName, lastName },
      { new: true }
    ).select("-__v");

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
