import User from "../models/User.js";
import Product from "../models/Product.js";

export async function manageAssignmentSellerAndProduct(
  sellerId,
  productId,
  isSaveSeller = true,
  isSaveProduct = true,
  toAssign = true,
) {
  const seller = await User.findById(sellerId);
  const product = await Product.findById(productId);

  if (!seller || !product) {
    throw new Error("Seller or product not found");
  }

  const updateArray = (array, item, shouldAdd) => {
    const exists = array.includes(item);
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
    updateArray(seller.assignedProducts, product._id, toAssign) &&
    isSaveSeller
  ) {
    await seller.save();
  }

  // Update product's assigned sellers
  if (
    updateArray(product.assignedSellers, seller._id, toAssign) &&
    isSaveProduct
  ) {
    await product.save();
  }
}
