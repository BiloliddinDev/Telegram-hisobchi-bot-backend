const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const { authenticate, isAdmin } = require("../middleware/auth");
const { validateProduct } = require("../middleware/validation");

// Get all products (admin only)
router.get("/", authenticate, isAdmin, async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: ["category"],
      sort: { createdAt: -1 },
    };
    const products = await Product.paginate(filter, options);
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single productId
router.get("/:id", authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category")
      .populate("assignedSellers", "username firstName lastName");

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
    const {
      name,
      description,
      price,
      costPrice,
      category,
      warehouseQuantity,
      image,
      sku,
      color,
    } = req.body;
    const categoryExists = await Category.exists({ _id: category });

    if (!categoryExists) {
      res.status(400).json({ error: "Category not found" });
    }

    const product = await Product.create({
      name,
      description,
      price,
      costPrice,
      category,
      warehouseQuantity,
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
    const {
      name,
      description,
      price,
      costPrice,
      category,
      stock,
      image,
      sku,
      color,
      isActive,
    } = req.body;

    const categoryExists = await Category.exists({ _id: category });

    if (!categoryExists) {
      res.status(400).json({ error: "Category not found" });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price,
        costPrice,
        category,
        count: stock,
        image,
        sku,
        color,
        isActive,
      },
      { new: true },
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
