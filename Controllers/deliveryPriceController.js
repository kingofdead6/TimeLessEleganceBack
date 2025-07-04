import asyncHandler from "express-async-handler";
import DeliveryPrice from "../Models/deliveryPriceModel.js";

export const getDeliveryPrices = asyncHandler(async (req, res) => {
  let prices = await DeliveryPrice.findOne();
  if (!prices) {
    prices = new DeliveryPrice();
    await prices.save();
  }
  res.json({ prices: prices.prices });
});

export const updateDeliveryPrices = asyncHandler(async (req, res) => {
  const { prices } = req.body;
  let deliveryPrices = await DeliveryPrice.findOne();
  if (!deliveryPrices) {
    deliveryPrices = new DeliveryPrice();
  }
  deliveryPrices.prices = prices;
  await deliveryPrices.save();
  res.json({ prices: deliveryPrices.prices });
});