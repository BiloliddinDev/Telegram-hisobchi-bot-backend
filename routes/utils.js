const User = require("../models/User");
const Product = require("../models/Product");

async function manageAssignmentSellerAndProduct(
  seller,
  product,
  isSaveSeller = true,
  isSaveProduct = true,
  toAssign = true,
) {
  const validSeller = seller;
  const validProduct = product;

  if (typeof seller === "string") seller = await User.findById(seller);
  if (typeof product === "string") product = await Product.findById(product);

  if (!validSeller || !validProduct) {
    throw new Error("Seller or product not found");
  }

  const updateArray = (array, item, shouldAdd) => {
    const exists = array.some((id) => id.toString() === item.toString());
    if (shouldAdd && !exists) {
      array.push(item);
      return true;
    } else if (!shouldAdd && exists) {
      array.pull(item);
      return true;
    }
    return false;
  };

  // Update seller's assigned products
  if (
    updateArray(validSeller.assignedProducts, product._id, toAssign) &&
    isSaveSeller
  ) {
    await validSeller.save();
  }

  // Update product's assigned sellers
  if (
    updateArray(validProduct.assignedSellers, seller._id, toAssign) &&
    isSaveProduct
  ) {
    await validProduct.save();
  }
}

module.exports = {
  manageAssignmentSellerAndProduct,
};
