import mongoose from "mongoose";

const deliveryPriceSchema = new mongoose.Schema({
  prices: {
    desk: {
      type: Map,
      of: Number,
      default: { default: 700 }
    },
    address: {
      type: Map,
      of: Number,
      default: { default: 1000 }
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

deliveryPriceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("DeliveryPrice", deliveryPriceSchema);