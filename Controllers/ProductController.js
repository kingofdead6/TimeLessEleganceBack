import asyncHandler from "express-async-handler";
import Product from "../Models/productModel.js";
import cloudinary from "../utils/cloudinary.js";

// Schema-defined categories and subcategories
const SCHEMA_CATEGORIES = ["Clothing", "Footwear", "Accessories", "Outerwear"];
const SCHEMA_SUBCATEGORIES = {
  Clothing: ["Shirt", "Pants", "Dress", "Skirt", "Sweater", "T-Shirt", "Shorts", "Thobe", "Hoddies"],
  Footwear: ["Sneakers", "Boots", "Sandals", "Dress Shoes", "Slippers"],
  Accessories: ["Hat", "Belt", "Scarf", "Gloves", "Sunglasses", "Bag", "Watch", "cap"],
  Outerwear: ["Coat", "Parka", "Trench Coat", "Bomber Jacket", "Jacket", "Raincoat"],
};
const clothingSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json(product);
});

export const getProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20000, search, category, gender, age, season, subcategory, newest, trending } = req.query;

  const query = {};
  if (search) query.$text = { $search: search };
  if (category) query.category = category;
  if (gender) query.gender = gender;
  if (age) query.age = age;
  if (season) query.season = season;
  if (subcategory) query.subcategory = subcategory;
  if (newest === "true") query.isNewest = true;
  if (trending === "true") query.isTrending = true;

  const pipeline = [
    { $match: query },
    ...(newest === "true" || trending === "true" ? [{ $sort: { createdAt: -1 } }] : []),
    ...(newest !== "true" && trending !== "true" ? [{ $sample: { size: Number(limit) * 8 } }, { $skip: (Number(page) - 1) * Number(limit) }, { $limit: Number(limit) }] : []),
  ];

  const products = await Product.aggregate(pipeline).exec();
  const total = await Product.countDocuments(query);
  const pages = Math.ceil(total / Number(limit));

  res.json({ products, pages, total });
});

export const getRelatedProducts = asyncHandler(async (req, res) => {
  const { productId, category, subcategory } = req.query;

  if (!productId || !category) {
    res.status(400);
    throw new Error("Product ID and category are required");
  }

  const relatedProducts = [];
  const limit = 8;

  // Priority 1: Same subcategory
  if (subcategory) {
    const sameSubcategory = await Product.aggregate([
      { $match: { _id: { $ne: productId }, subcategory, category } },
      { $sample: { size: limit } },
    ]);
    relatedProducts.push(...sameSubcategory);
  }

  // Priority 2: Same category (if needed)
  if (relatedProducts.length < limit) {
    const sameCategory = await Product.aggregate([
      { $match: { _id: { $ne: productId }, category, subcategory: { $ne: subcategory } } },
      { $sample: { size: limit - relatedProducts.length } },
    ]);
    relatedProducts.push(...sameCategory);
  }

  // Priority 3: Random products (if needed)
  if (relatedProducts.length < limit) {
    const randomProducts = await Product.aggregate([
      { $match: { _id: { $ne: productId }, category: { $ne: category } } },
      { $sample: { size: limit - relatedProducts.length } },
    ]);
    relatedProducts.push(...randomProducts);
  }

  res.json({ products: relatedProducts.slice(0, limit) });
});

export const createProduct = asyncHandler(async (req, res) => {
  const { name, price, description, gender, age, category, subcategory, season, stock, isNewest, isTrending } = req.body;

  const parsedStock = typeof stock === "string" ? JSON.parse(stock) : stock;

  if (category !== "Footwear") {
    for (const item of parsedStock) {
      if (!clothingSizes.includes(item.size)) {
        res.status(400);
        throw new Error(`Invalid size '${item.size}' for ${category}. Must be one of ${clothingSizes.join(", ")}`);
      }
    }
  }


  const pictures = [];
  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map((file) =>
      new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
          if (error) {
            return reject(new Error("Failed to upload image to Cloudinary"));
          }
          resolve(result.secure_url);
        }).end(file.buffer);
      })
    );

    try {
      const urls = await Promise.all(uploadPromises);
      pictures.push(...urls);
    } catch (error) {
      res.status(400);
      throw new Error("Failed to upload images to Cloudinary");
    }
  }

  if (pictures.length === 0) {
    res.status(400);
    throw new Error("At least one product image is required");
  }

  const product = new Product({
    user_id: req.user._id,
    name,
    price,
    description,
    gender,
    age,
    pictures,
    category,
    subcategory,
    season,
    stock: parsedStock,
    isNewest: isNewest === "true" || isNewest === true,
    isTrending: isTrending === "true" || isTrending === true,
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, price, description, gender, age, category, subcategory, season, stock, existingPictures, removePictures, isNewest, isTrending } = req.body;

  const product = await Product.findById(id);
  if (!product) {
    res.status(400);
    throw new Error("Product not found");
  }

  const parsedStock = typeof stock === "string" ? JSON.parse(stock) : stock;

  if (category !== "Footwear") {
    for (const item of parsedStock) {
      if (!clothingSizes.includes(item.size)) {
        res.status(400);
        throw new Error(`Invalid size '${item.size}' for ${category}. Must be one of ${clothingSizes.join(", ")}`);
      }
    }
  }

  const pictures = existingPictures ? (Array.isArray(existingPictures) ? existingPictures : JSON.parse(existingPictures)) : [];
  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map((file) =>
      new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
          if (error) {
            return reject(new Error("Failed to upload image to Cloudinary"));
          }
          resolve(result.secure_url);
        }).end(file.buffer);
      })
    );

    try {
      const urls = await Promise.all(uploadPromises);
      pictures.push(...urls);
    } catch (error) {
      res.status(400);
      throw new Error("Failed to upload images to Cloudinary");
    }
  }

  const picturesToRemove = removePictures ? (Array.isArray(removePictures) ? removePictures : JSON.parse(removePictures)) : [];
  product.pictures = pictures.filter((pic) => !picturesToRemove.includes(pic));

  if (product.pictures.length === 0) {
    res.status(400);
    throw new Error("At least one product image is required");
  }

  product.name = name || product.name;
  product.price = price || product.price;
  product.description = description || product.description;
  product.gender = gender || product.gender;
  product.age = age || product.age;
  product.category = category || product.category;
  product.subcategory = subcategory || product.subcategory;
  product.season = season || product.season;
  product.stock = parsedStock || product.stock;
  product.isNewest = isNewest === "true" || isNewest === true;
  product.isTrending = isTrending === "true" || isTrending === true;

  const updatedProduct = await product.save();
  res.json(updatedProduct);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  await product.deleteOne();
  res.json({ message: "Product deleted successfully" });
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct("category");
  res.json({ categories });
});

export const getSubcategories = asyncHandler(async (req, res) => {
  const { category } = req.query;
  if (!category) {
    return res.status(400).json({ message: "Category is required" });
  }

  const subcategories = await Product.distinct("subcategory", { category });
  res.json({ subcategories });
});

export const getAllCategories = asyncHandler(async (req, res) => {
  res.json({ categories: SCHEMA_CATEGORIES });
});

export const getAllSubcategories = asyncHandler(async (req, res) => {
  const { category } = req.query;
  if (!category) {
    return res.status(400).json({ message: "Category is required" });
  }

  const subcategories = SCHEMA_SUBCATEGORIES[category] || [];
  res.json({ subcategories });
});