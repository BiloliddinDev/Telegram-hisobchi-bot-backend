const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { authenticate, isAdmin } = require("../middleware/auth");
const { validateProduct } = require("../middleware/validation");

// Get all products (admin only)
router.get("/", authenticate, isAdmin, async (req, res) => {
  try {
    const products = await Product.find()
      .populate("assignedSellers", "username firstName lastName")
      .sort({ createdAt: -1 });

    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single productId
router.get("/:id", authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "assignedSellers",
      "username firstName lastName"
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product (admin only)
router.post("/", authenticate, isAdmin, validateProduct, async (req, res) => {
  try {
    const { name, description, price, costPrice, category, stock, image, sku, color } = req.body;

    const product = await Product.create({
      name,
      description,
      price,
      costPrice,
      category,
      count: stock,
      image,
      sku,
      color,
    });

    res.status(201).json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product (admin only)
router.put("/:id", authenticate, isAdmin, validateProduct, async (req, res) => {
  try {
    const { name, description, price, costPrice, category, stock, image, sku, color, isActive } =
      req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, description, price, costPrice, category, count: stock, image, sku, color, isActive },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product (admin only)
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

