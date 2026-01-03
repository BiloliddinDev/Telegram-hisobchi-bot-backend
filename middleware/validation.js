const validateProduct = (req, res, next) => {
  const { name, price, costPrice, stock, category } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: "Mahsulot nomi majburiy" });
  }

  if (!price || isNaN(price) || price <= 0) {
    return res.status(400).json({ error: "To'g'ri sotuv narxini kiriting" });
  }

  if (costPrice !== undefined && (isNaN(costPrice) || costPrice < 0)) {
    return res.status(400).json({ error: "To'g'ri tan narxini kiriting" });
  }

  if (stock !== undefined && (isNaN(stock) || stock < 0)) {
    return res.status(400).json({ error: "To'g'ri miqdor kiriting" });
  }

  if (!category) {
    return res.status(400).json({ error: "Mahsulot kategoriyasi ID majburiy" });
  }

  next();
};

const validateSale = (req, res, next) => {
  const { productId, quantity, price } = req.body;

  if (!productId) {
    return res.status(400).json({ error: "Mahsulot ID majburiy" });
  }

  if (!quantity || isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "To'g'ri miqdor kiriting" });
  }

  if (!price || isNaN(price) || price <= 0) {
    return res.status(400).json({ error: "To'g'ri narx kiriting" });
  }

  next();
};

const validateSeller = (req, res, next) => {
  const { phoneNumber, firstName } = req.body;

  if (!phoneNumber || phoneNumber.trim().length === 0) {
    return res.status(400).json({ error: "Telefon raqam majburiy" });
  }

  if (!firstName || firstName.trim().length === 0) {
    return res.status(400).json({ error: "Ism majburiy" });
  }

  next();
};

const validateCategory = (req, res, next) => {
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: "Kategoriya nomi majburiy" });
  }

  if (name.trim().length < 2) {
    return res
      .status(400)
      .json({
        error: "Kategoriya nomi kamida 2 ta belgidan iborat bo'lishi kerak",
      });
  }

  if (name.trim().length > 50) {
    return res
      .status(400)
      .json({ error: "Kategoriya nomi 50 ta belgidan oshmasligi kerak" });
  }

  next();
};

module.exports = {
  validateProduct,
  validateSale,
  validateSeller,
  validateCategory,
};
