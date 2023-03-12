const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

/*Product API URL*/

router.route("/cart/item").post(productController.addItem);
router.route("/cart/items").get(productController.list);
router.route("/cart/items/:cartItemId").get(productController.cartList);
router
  .route("/cart/checkout-value/:cartId")
  .get(productController.cartCheckoutValue);
router.route("/cart/:cartId").put(productController.deleteCart);

router.route("/product/:id").get(productController.productList);
router.route("/warehouse/distance").get(productController.warehouseList);

module.exports = router;
