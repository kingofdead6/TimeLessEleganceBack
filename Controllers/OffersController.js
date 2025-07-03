import asyncHandler from "express-async-handler";
import Offer from "../Models/offersModel.js";
import cloudinary from "../utils/cloudinary.js";
export const getOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find({ showOnMainPage: true }).sort({ createdAt: -1 }).limit(4);
  res.json({ offers });
});

export const getAdminOffers = asyncHandler(async (req, res) => {
  
  const offers = await Offer.find().sort({ createdAt: -1 });
  res.json({ offers });
});

export const createOffer = asyncHandler(async (req, res) => {
  
  const { title, description, showOnMainPage } = req.body;
  if (!title || !description || !req.file) {
    res.status(400);
    throw new Error("Title, description, and image are required");
  }

  if (showOnMainPage === "true" || showOnMainPage === true) {
    const visibleOffersCount = await Offer.countDocuments({ showOnMainPage: true });
    if (visibleOffersCount >= 4) {
      res.status(400);
      throw new Error("Cannot show more than 4 offers on the main page at the same time");
    }
  }

  const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
      if (error) return reject(new Error("Failed to upload image to Cloudinary"));
      resolve(result.secure_url);
    }).end(req.file.buffer);
  });

  const offer = new Offer({ title, description, image: uploadResult, showOnMainPage });
  await offer.save();
  res.status(201).json({ message: "Offer created successfully", offer });
});

export const updateOffer = asyncHandler(async (req, res) => {
  
  const { id } = req.params;
  const { title, description, showOnMainPage } = req.body;

  if (!title || !description) {
    res.status(400);
    throw new Error("Title and description are required");
  }

  const offer = await Offer.findById(id);
  if (!offer) {
    res.status(404);
    throw new Error("Offer not found");
  }

  if ((showOnMainPage === "true" || showOnMainPage === true) && !offer.showOnMainPage) {
    const visibleOffersCount = await Offer.countDocuments({ showOnMainPage: true });
    if (visibleOffersCount >= 4) {
      res.status(400);
      throw new Error("Cannot show more than 4 offers on the main page at the same time");
    }
  }

  offer.title = title;
  offer.description = description;
  offer.showOnMainPage = showOnMainPage === "true" || showOnMainPage === true;

  if (req.file) {
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
        if (error) return reject(new Error("Failed to upload image to Cloudinary"));
        resolve(result.secure_url);
      }).end(req.file.buffer);
    });
    offer.image = uploadResult;
  }

  await offer.save();
  res.json({ message: "Offer updated successfully", offer });
});

export const deleteOffer = asyncHandler(async (req, res) => {
  
  const { id } = req.params;
  const offer = await Offer.findById(id);
  if (!offer) {
    res.status(404);
    throw new Error("Offer not found");
  }
  await offer.deleteOne();
  res.json({ message: "Offer deleted successfully" });
});