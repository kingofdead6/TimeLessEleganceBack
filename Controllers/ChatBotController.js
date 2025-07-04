import asyncHandler from "express-async-handler";
import Product from "../Models/productModel.js";
import DeliveryPrice from "../Models/deliveryPriceModel.js";
import genAI from "../utils/geminiClient.js";
import multer from "multer";
import fs from "fs";
import path from "path";

// Multer configuration for image uploads
const uploadDir = "Uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and GIF images are allowed"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Utility function to count words
const countWords = (text) => {
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
};

// Adjust response length
const adjustResponseLength = (text, targetWordCount, appendMessage = "") => {
  const appendWordCount = countWords(appendMessage);
  const baseTarget = targetWordCount - appendWordCount;
  let words = text.trim().split(/\s+/).filter((word) => word.length > 0);

  if (words.length > baseTarget) {
    words = words.slice(0, baseTarget);
  }

  return appendMessage ? `${words.join(" ")}\n\n${appendMessage}` : words.join(" ");
};

// Check if message is a shop-related query
const isShopQuery = (message) => {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("categories") || lowerMessage.includes("category")) {
    return "categories";
  }
  if (lowerMessage.includes("subcategories") || lowerMessage.includes("subcategory")) {
    return "subcategories";
  }
  if (lowerMessage.includes("products") || lowerMessage.includes("items")) {
    return "products";
  }
  if (lowerMessage.includes("location") || lowerMessage.includes("address") || lowerMessage.includes("store")) {
    return "location";
  }
  if (lowerMessage.includes("delivery") || lowerMessage.includes("shipping")) {
    // Check for home delivery explicitly
    if (lowerMessage.includes("home") || lowerMessage.includes("house")) {
      return "homeDelivery";
    }
    // Check for wilaya-specific delivery (any delivery query with a potential wilaya name)
    const wilayaMatch = lowerMessage.match(/(?:delivery|shipping|price\s+of\s+delivery|cost\s+of\s+delivery|address\s+delivery|how\s+much|how\s+many)\s*(?:to|in|for|at)?\s*([\w\s-]+)/i);
    if (wilayaMatch) {
      return "wilayaDelivery";
    }
    return "delivery"; // Fallback for general delivery queries
  }
  return null;
};

// Check if message is a greeting
const isGreeting = (message) => {
  const greetings = [
    "hi",
    "hello",
    "hey",
    "greetings",
    "good morning",
    "good afternoon",
    "good evening",
  ];
  const lowerMessage = message.toLowerCase().trim();
  return greetings.some((greeting) => lowerMessage === greeting);
};

// Fetch categories
const getCategories = async () => {
  try {
    const categories = await Product.distinct("category");
    if (categories.length === 0) {
      return "No product categories found in our store.";
    }
    return `Available categories: ${categories.join(", ")}.`;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return "Unable to fetch categories due to an error.";
  }
};

// Fetch subcategories
const getSubcategories = async (message) => {
  try {
    const validCategories = ["Clothing", "Footwear", "Accessories", "Outerwear"];
    const categoryMatch = message.match(/(?:subcategories|subcategory)\s*(?:for|of|in)\s*([\w\s]+)/i);
    let category = categoryMatch ? categoryMatch[1].trim() : null;

    if (category) {
      category = validCategories.find((cat) => cat.toLowerCase() === category.toLowerCase());
    }

    if (!category) {
      const lowerMessage = message.toLowerCase();
      category = validCategories.find((cat) => lowerMessage.includes(cat.toLowerCase()));
    }

    if (!category) {
      return `Please specify a valid category (e.g., 'subcategories for Clothing'). Available categories: ${validCategories.join(", ")}.`;
    }

    const subcategories = await Product.distinct("subcategory", { category });
    if (subcategories.length === 0) {
      return `No subcategories found for ${category}.`;
    }
    return `Subcategories for ${category}: ${subcategories.join(", ")}.`;
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    return "Unable to fetch subcategories due to an error.";
  }
};

// Fetch products in a category
const getProducts = async (message) => {
  try {
    const validCategories = ["Clothing", "Footwear", "Accessories", "Outerwear"];
    const categoryMatch = message.match(/(?:products|items)\s*(?:in|for|of)?\s*([\w\s]+)/i);
    let category = categoryMatch ? categoryMatch[1].trim() : null;

    if (category) {
      category = validCategories.find((cat) => cat.toLowerCase() === category.toLowerCase());
    }

    if (!category) {
      const lowerMessage = message.toLowerCase();
      category = validCategories.find((cat) => lowerMessage.includes(cat.toLowerCase()));
    }

    if (!category) {
      return `Please specify a valid category (e.g., 'products in Clothing'). Available categories: ${validCategories.join(", ")}.`;
    }

    const products = await Product.find({ category }).select("name price").limit(10);
    if (products.length === 0) {
      return `No products found in ${category}.`;
    }
    return `Products in ${category}:\n${products
      .map((p) => `- ${p.name} ($${p.price.toFixed(2)})`)
      .join("\n")}.`;
  } catch (error) {
    console.error("Error fetching products:", error);
    return "Unable to fetch products due to an error.";
  }
};

// Fetch store location
const getLocation = () => {
  return "Our store is located at 123 Elegance Street, Algiers, Algeria. Visit us or shop online at timelesselegance.com!";
};

// Fetch delivery options
const getDeliveryOptions = async (message, queryType) => {
  try {
    const deliveryPrices = await DeliveryPrice.findOne();
    if (!deliveryPrices) {
      return "No delivery options available at the moment. Please contact support at support@timelesselegance.com.";
    }
    const { desk, address } = deliveryPrices.prices;

    // Convert Map to plain object if necessary
    const deskPrices = desk instanceof Map ? Object.fromEntries(desk) : desk;
    const addressPrices = address instanceof Map ? Object.fromEntries(address) : address;

    if (queryType === "homeDelivery") {
      const defaultDeskPrice = deskPrices.default || 0;
      const defaultAddressPrice = addressPrices.default || 0;
      return `Yes, we offer delivery to home. Address Delivery: $${defaultAddressPrice}. Desk Delivery: $${defaultDeskPrice}.`;
    }

    if (queryType === "wilayaDelivery") {
      const wilayaMatch = message.match(/(?:delivery|shipping|price\s+of\s+delivery|cost\s+of\s+delivery|address\s+delivery|how\s+much|how\s+many)\s*(?:to|in|for|at)?\s*([\w\s-]+)/i);
      const wilaya = wilayaMatch ? wilayaMatch[1].trim() : null;
      if (!wilaya) {
        return "Please specify a wilaya for delivery (e.g., 'delivery to Batna').";
      }
      // Normalize wilaya name (e.g., "batna" -> "Batna", "oum el bouaghi" -> "Oum El Bouaghi")
      const normalizedWilaya = wilaya
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
      const deskPrice = deskPrices[normalizedWilaya] || deskPrices.default || 0;
      const addressPrice = addressPrices[normalizedWilaya] || addressPrices.default || 0;
      return `Yes, we offer delivery to ${normalizedWilaya}. Address Delivery: $${addressPrice}. Desk Delivery: $${deskPrice}.`;
    }

    // Fallback for general delivery queries
    const defaultDeskPrice = deskPrices.default || 0;
    const defaultAddressPrice = addressPrices.default || 0;
    return `Yes, we offer delivery. Address Delivery: $${defaultAddressPrice}. Desk Delivery: $${defaultDeskPrice}.`;
  } catch (error) {
    console.error("Error fetching delivery options:", error);
    return "Unable to fetch delivery options due to an error.";
  }
};

// Handle chat messages
const handleChatMessage = asyncHandler(async (req, res) => {
  const { message = "" } = req.body;
  const image = req.file;

  if (!message && !image) {
    return res.status(400).json({ error: "Message or image is required" });
  }

  try {
    // Handle shop-related queries
    const shopQueryType = isShopQuery(message);
    if (shopQueryType) {
      let dbResponse;
      if (shopQueryType === "categories") {
        dbResponse = await getCategories();
      } else if (shopQueryType === "subcategories") {
        dbResponse = await getSubcategories(message);
      } else if (shopQueryType === "products") {
        dbResponse = await getProducts(message);
      } else if (shopQueryType === "location") {
        dbResponse = getLocation();
      } else if (shopQueryType === "homeDelivery" || shopQueryType === "wilayaDelivery" || shopQueryType === "delivery") {
        dbResponse = await getDeliveryOptions(message, shopQueryType);
      }

      const adjustedReply = adjustResponseLength(dbResponse, 100);
      return res.json({ reply: adjustedReply });
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Handle greetings
    if (isGreeting(message) && !image) {
      const greetingPrompt = `Respond to the greeting "${message}" with a friendly message in up to 40 words, encouraging shop-related questions or image uploads. Example: "Hello! How can I help with categories, products, or delivery today?"`;

      let greetingResult;
      try {
        greetingResult = await model.generateContent(greetingPrompt);
      } catch (apiError) {
        throw new Error("Failed to generate greeting response with Gemini API");
      }
      const greetingText = await greetingResult.response.text();

      const adjustedReply = adjustResponseLength(greetingText, 50);
      return res.json({ reply: adjustedReply });
    }

    // Check if message is shop-related
    let isShopRelated = false;
    if (message || image) {
      const classificationPrompt = image
        ? `Determine if the following query, which includes an image, is related to an e-commerce shop (products, categories, delivery, store location, etc.). The text is: "${message}". Answer only with "Yes" or "No".`
        : `Determine if the following question is related to an e-commerce shop (products, categories, delivery, store location, etc.). Answer only with "Yes" or "No": "${message}"`;

      let classificationResult;
      try {
        classificationResult = await model.generateContent(classificationPrompt);
      } catch (apiError) {
        throw new Error("Failed to classify message with Gemini API");
      }
      const classificationText = await classificationResult.response.text();
      isShopRelated = classificationText.trim().toLowerCase() === "yes";
    }

    // Handle response
    let responsePrompt;
    let targetWordCount;
    let appendMessage;

    if (isShopRelated) {
      targetWordCount = 100;
      appendMessage = "Visit our website for more details or ask me for specific products!";

      if (image) {
        const imagePath = path.resolve(image.path);
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString("base64");

        responsePrompt = [
          {
            text: `Analyze the provided image and the following shop-related question: "${message}". Provide a response in up to 90 words describing any relevant observations (e.g., product identification) and potential shop-related information (e.g., availability, category).`,
          },
          {
            inlineData: {
              mimeType: image.mimetype,
              data: base64Image,
            },
          },
        ];

        fs.unlinkSync(imagePath);
      } else {
        responsePrompt = `Answer the following shop-related question in up to 90 words: "${message}"`;
      }
    } else {
      targetWordCount = 50;
      appendMessage = "I'm designed to answer shop-related questions. Please ask about products, categories, delivery, or upload a relevant image.";

      if (image) {
        const imagePath = path.resolve(image.path);
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString("base64");

        responsePrompt = [
          {
            text: `The user uploaded an image with the message: "${message}". Since this does not appear to be shop-related, respond in up to 40 words, asking for a shop-related question or image.`,
          },
          {
            inlineData: {
              mimeType: image.mimetype,
              data: base64Image,
            },
          },
        ];

        fs.unlinkSync(imagePath);
      } else {
        responsePrompt = `Answer the following question in up to 40 words: "${message}"`;
      }
    }

    let responseResult;
    try {
      responseResult = await model.generateContent(responsePrompt);
    } catch (apiError) {
      throw new Error("Failed to generate response with Gemini API");
    }
    const responseText = await responseResult.response.text();

    const adjustedReply = adjustResponseLength(responseText, targetWordCount, appendMessage);
    res.json({ reply: adjustedReply });
  } catch (error) {
    if (image && fs.existsSync(image.path)) {
      fs.unlinkSync(image.path);
    }
    res.status(500).json({ error: "Failed to process request: " + error.message });
  }
});

export default [upload.single("image"), handleChatMessage];