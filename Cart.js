const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const _C = require("../config/constants");

const CartSchema = new Schema(
  {
    userId: { type: Number },
    items: [
      {
        name: { type: String },
        price: { type: Number },
        discount_percentage: { type: Number },
        description: { type: String },
        category: { type: String },
        productId: { type: Number },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity can not be less then 1."],
        },
        rating: {
          count: { type: Number },
          rate: { type: Number },
        },
        image: { type: String },
        weight_in_grams: { type: Number },
        total_weight_grams: { type: Number },
        totalPrice: { type: Number },
        status: {
          type: Number,
          enum: [_C.status.active, _C.status.inactive, _C.status.deleted],
          default: _C.status.active,
          required: true,
        },
        newCreatedAt: { type: Date, default: Date.now },
        newUpdatedAt: { type: Date, default: Date.now },
      },
    ],
    total_weight_kg: { type: Number },
    subTotal: {
      default: 0,
      type: Number,
    },
    cartItemsQty: {
      default: 0,
      type: Number,
    },
    deliveryFee: { type: Number },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    versionKey: false,
    timestamps: true,
    collection: "cart",
  }
);

CartSchema.index({ updatedAt: 1 });

let cartModel = mongoose.model("Cart", CartSchema);
module.exports = cartModel;
