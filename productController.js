const HttpStatus = require("http-status");
const _ = require("lodash");
const _C = require("../config/constants");
const axios = require("axios");
const CartModel = require("../models/Cart");
const mongoose = require("mongoose");

/**
 * Add Items to Cart
 * url : /cart/item
 * method : POST
 * author : Sathyamoorthi Ravi
 * body   : title,price,category,description,discount_percentage,weight_in_grams,rating,image
 */
exports.addItem = async (req, res) => {
  try {
    const result = await axios({
      url: `http://15.206.157.204:8080/product/${req.body.id}`,
      method: "get",
    });
    const productData = result.data.response;
    if (productData === undefined) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id. Valid product id range is 100 to 119.",
      });
    }
    let quantity = Number.parseInt(req.body.quantity ? req.body.quantity : 1);
    let price =
      quantity * (productData.price ? productData.price.toFixed(2) : 0);
    let total_weight =
      quantity *
      (productData.weight_in_grams
        ? productData.weight_in_grams.toFixed(2)
        : 0);

    const updateCart = await CartModel.findOneAndUpdate(
      {
        userId: req.body.userId
          ? req.body.userId
          : 100 /** Will add the condition based on userId or without signin uuid**/,
      },
      {
        $push: {
          items: {
            name: productData.title,
            price: productData.price,
            discount_percentage: productData.additionalCharges,
            category: productData.category,
            description: productData.description,
            weight_in_grams: productData.weight_in_grams,
            rating: productData.rating,
            image: productData.image,
            productId: productData.id,
            quantity: quantity ? quantity : 1,
            totalPrice: price,
            total_weight_grams: total_weight,
          },
        },
      },
      { upsert: true, new: true }
    ).exec();

    const subTotal = updateCart.items
      .map((item) => item.totalPrice)
      .reduce((acc, next) => acc + next);

    cartItemsQty = updateCart.items.length;

    const get_total_weight = updateCart.items
      .map((item) => item.total_weight_grams)
      .reduce((acc, next) => acc + next);

    const response = await CartModel.findOneAndUpdate(
      { _id: updateCart._id },
      {
        subTotal: subTotal,
        cartItemsQty: cartItemsQty,
        total_weight_kg: (get_total_weight * 0.001).toFixed(2),
      },
      {
        new: true,
      }
    );
    return res.status(HttpStatus.OK).json({ success: 200, data: response });
  } catch (err) {
    return res
      .status(HttpStatus.NOT_FOUND)
      .json({ success: HttpStatus.NOT_FOUND, data: err.error });
  }
};

/**
 * Get all cart items
 * url : /cart/items
 * method : GET
 * author : Sathyamoorthi Ravi
 */
exports.list = async (req, res) => {
  try {
    const getCart = await CartModel.find({ "items.status": 1 })
      .select(
        "_id subTotal total_weight_kg cartItemsQty items._id items.name items.quantity items.totalPrice items.price items.image items.weight_in_grams items.total_weight_grams items.productId items.category"
      )
      .sort({ "items.newUpdatedAt": -1 })
      .lean()
      .exec();

    return res.status(HttpStatus.OK).json({ success: 200, data: getCart });
  } catch (err) {
    return res.status(HttpStatus.NOT_FOUND).json({
      success: HttpStatus.NOT_FOUND,
      message: err.errmsg ? err.errmsg : err,
    });
  }
};

/**
 * Get single cart item
 * url : /cart/items/{cartItemId}
 * method : GET
 * author : Sathyamoorthi Ravi
 */
exports.cartList = async (req, res) => {
  try {
    var getCart = await CartModel.aggregate([
      {
        $unwind: {
          path: "$items",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $sort: { newUpdatedAt: -1 } },
      {
        $match: {
          "items._id": new mongoose.Types.ObjectId(req.params.cartItemId),
          "items.status": _C.status.active,
        },
      },
    ]);

    res.status(200).json(getCart[0]);
  } catch (err) {
    return res.status(HttpStatus.NOT_FOUND).json({
      success: HttpStatus.NOT_FOUND,
      message: err.errmsg ? err.errmsg : err,
    });
  }
};

/**
 * Remove all items from cart
 * url : /cart/{{cartId}
 * method : PUT
 * author : Sathyamoorthi Ravi
 */
exports.deleteCart = async (req, res) => {
  try {
    const clearCart = await CartModel.findOneAndUpdate(
      {
        _id: req.params.cartId,
      },
      {
        $unset: { items: 1 },
        cartItemsQty: 0,
        subTotal: 0,
        total_weight_kg: 0,
      },
      { multi: true, new: true }
    );
    if (clearCart == null) {
      res.status(404).json({ success: 404, data: "Invalid Cart" });
    } else {
      res.status(200).json(clearCart);
    }
  } catch (err) {
    res.status(500).json({ msg: err });
  }
};

/**
 * Remove all items from cart
 * url : /cart/checkout-value/{cartId}?shipping_object={"postal_code": 465535,"distance_in_kilometers": 4}
 * method : GET
 * author : Sathyamoorthi Ravi
 */
exports.cartCheckoutValue = async (req, res) => {
  try {
    const query = JSON.parse(req.query.shipping_object);
    const distance_in_kilometers = query.distance_in_kilometers.toFixed(2);

    const getCart = await CartModel.findOne({ _id: req.params.cartId })
      .select("_id subTotal total_weight_kg cartItemsQty items")
      .sort({ "items.newUpdatedAt": -1 })
      .lean()
      .exec();
    if (!getCart || getCart == null) {
      res.status(404).json({ success: 404, data: "Invalid Cart" });
    } else {
      let shippingCharge;

      if (getCart.total_weight_kg <= 2 && distance_in_kilometers < 5) {
        shippingCharge = 12;
      } else if (
        getCart.total_weight_kg <= 2 &&
        distance_in_kilometers >= 5 &&
        distance_in_kilometers < 20
      ) {
        shippingCharge = 15;
      } else if (
        getCart.total_weight_kg <= 2 &&
        distance_in_kilometers >= 20 &&
        distance_in_kilometers < 50
      ) {
        shippingCharge = 20;
      } else if (
        getCart.total_weight_kg <= 2 &&
        distance_in_kilometers >= 50 &&
        distance_in_kilometers < 500
      ) {
        shippingCharge = 50;
      } else if (
        getCart.total_weight_kg <= 2 &&
        distance_in_kilometers >= 500 &&
        distance_in_kilometers <= 800
      ) {
        shippingCharge = 100;
      } else if (getCart.total_weight_kg <= 2 && distance_in_kilometers > 800) {
        shippingCharge = 220;
      } else if (
        getCart.total_weight_kg >= 2.01 &&
        getCart.total_weight_kg <= 5 &&
        distance_in_kilometers < 5
      ) {
        shippingCharge = 14;
      } else if (
        getCart.total_weight_kg >= 2.01 &&
        getCart.total_weight_kg <= 5 &&
        distance_in_kilometers >= 5 &&
        distance_in_kilometers < 20
      ) {
        shippingCharge = 18;
      } else if (
        getCart.total_weight_kg >= 2.01 &&
        getCart.total_weight_kg <= 5 &&
        distance_in_kilometers >= 20 &&
        distance_in_kilometers < 50
      ) {
        shippingCharge = 24;
      } else if (
        getCart.total_weight_kg >= 2.01 &&
        getCart.total_weight_kg <= 5 &&
        distance_in_kilometers >= 50 &&
        distance_in_kilometers < 500
      ) {
        shippingCharge = 55;
      } else if (
        getCart.total_weight_kg >= 2.01 &&
        getCart.total_weight_kg <= 5 &&
        distance_in_kilometers >= 500 &&
        distance_in_kilometers <= 800
      ) {
        shippingCharge = 110;
      } else if (
        getCart.total_weight_kg >= 2.01 &&
        getCart.total_weight_kg <= 5 &&
        distance_in_kilometers > 800
      ) {
        shippingCharge = 250;
      } else if (
        getCart.total_weight_kg >= 5.01 &&
        getCart.total_weight_kg <= 20 &&
        distance_in_kilometers < 5
      ) {
        shippingCharge = 16;
      } else if (
        getCart.total_weight_kg >= 5.01 &&
        getCart.total_weight_kg <= 20 &&
        distance_in_kilometers >= 5 &&
        distance_in_kilometers < 20
      ) {
        shippingCharge = 25;
      } else if (
        getCart.total_weight_kg >= 5.01 &&
        getCart.total_weight_kg <= 20 &&
        distance_in_kilometers >= 20 &&
        distance_in_kilometers < 50
      ) {
        shippingCharge = 30;
      } else if (
        getCart.total_weight_kg >= 5.01 &&
        getCart.total_weight_kg <= 20 &&
        distance_in_kilometers >= 50 &&
        distance_in_kilometers < 500
      ) {
        shippingCharge = 80;
      } else if (
        getCart.total_weight_kg >= 5.01 &&
        getCart.total_weight_kg <= 20 &&
        distance_in_kilometers >= 500 &&
        distance_in_kilometers <= 800
      ) {
        shippingCharge = 130;
      } else if (
        getCart.total_weight_kg >= 5.01 &&
        getCart.total_weight_kg <= 20 &&
        distance_in_kilometers > 800
      ) {
        shippingCharge = 270;
      } else if (
        getCart.total_weight_kg >= 20.01 &&
        distance_in_kilometers < 5
      ) {
        shippingCharge = 21;
      } else if (
        getCart.total_weight_kg >= 20.01 &&
        distance_in_kilometers < 5
      ) {
        shippingCharge = 21;
      } else if (
        getCart.total_weight_kg >= 20.01 &&
        distance_in_kilometers >= 5 &&
        distance_in_kilometers < 20
      ) {
        shippingCharge = 35;
      } else if (
        getCart.total_weight_kg >= 20.01 &&
        distance_in_kilometers >= 20 &&
        distance_in_kilometers < 50
      ) {
        shippingCharge = 50;
      } else if (
        getCart.total_weight_kg >= 20.01 &&
        distance_in_kilometers >= 50 &&
        distance_in_kilometers < 500
      ) {
        shippingCharge = 90;
      } else if (
        getCart.total_weight_kg >= 20.01 &&
        distance_in_kilometers >= 500 &&
        distance_in_kilometers <= 800
      ) {
        shippingCharge = 150;
      } else if (
        getCart.total_weight_kg >= 20.01 &&
        distance_in_kilometers > 800
      ) {
        shippingCharge = 300;
      }

      let response = {
        ...getCart,
        shippingCharge: shippingCharge,
        GrandTotal: shippingCharge + getCart.subTotal,
      };

      res.status(200).json(response);
    }
  } catch (err) {
    res.status(500).json({ msg: err });
  }
};

/**
 * Product Item List
 * url : product/{id}
 * method : GET
 * author : Sathyamoorthi Ravi
 */
exports.productList = async (req, res) => {
  try {
    const result = await axios({
      url: `http://15.206.157.204:8080/product/${req.params.id}`,
      method: "get",
    });

    res.status(200).json(result.data);
  } catch (err) {
    res.status(500).json({ msg: err });
  }
};

/**
 * Get Warehouse Details
 * url : /warehouse/distance?postal_code=465535
 * method : GET
 * author : Sathyamoorthi Ravi
 */
exports.warehouseList = async (req, res) => {
  try {
    const result = await axios({
      url: `http://15.206.157.204:8080/warehouse/distance?postal_code=${req.query.postal_code}`,
      method: "get",
    });

    res.status(200).json(result.data);
  } catch (err) {
    res.status(500).json({ msg: err });
  }
};
