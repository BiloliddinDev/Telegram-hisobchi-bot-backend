const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const { authenticate, isAdmin } = require("../middleware/auth");
const { validateCategory } = require("../middleware/validation");

router.get("/", authenticate, async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put(
  "/:id",
  authenticate,
  isAdmin,
  validateCategory,
  async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Category name is required" });
      }
      const category = await Category.findByIdAndUpdate(
        req.params.id,
        { name },
        { new: true },
      );
      res.status(200).json({ category });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ error: "Category already exists" });
      }
      res.status(500).json({ error: error.message });
    }
  },
);

router.post("/", authenticate, isAdmin, validateCategory, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }
    const category = await Category.create({ name });
    res.status(201).json({ category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Category already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
