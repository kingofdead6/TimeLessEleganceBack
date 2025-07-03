import mongoose from "mongoose";

const clothingSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

const productSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    gender: { type: String, enum: ["Men", "Women"], required: true },
    age: { type: String, enum: ["Child", "Teen", "Adult"], required: true },
    pictures: [{ type: String, required: true }],
    category: {
      type: String,
      enum: ["Clothing", "Footwear", "Accessories", "Outerwear"],
      required: true,
    },
    subcategory: {
      type: String,
      enum: [
        // Clothing
        "Shirt", "Pants", "Dress", "Skirt", "Sweater", "T-Shirt", "Shorts", "Thobe", "Hoddies",
        // Footwear
        "Sneakers", "Boots", "Sandals", "Dress Shoes", "Slippers",
        // Accessories
        "Hat", "Belt", "Scarf", "Gloves", "Sunglasses", "Bag", "Watch", "cap",
        // Outerwear
        "Coat", "Parka", "Trench Coat", "Bomber Jacket", "Jacket", "Raincoat",
      ],
      required: true,
    },
    season: { type: String, enum: ["Winter", "Summer", "Both"], required: true },
    stock: [
      {
        size: {
          type: String,
          required: true,
          validate: {
            validator: function (value) {
              const category = this.parent().category;
              if (category === "Footwear") {
                return true; // Allow any string for Footwear
              }
              return clothingSizes.includes(value);
            },
            message: (props) =>
              `Invalid size '${props.value}' for category '${props.path.split('.')[0]}.category'. Non-Footwear sizes must be one of ${clothingSizes.join(", ")}.`,
          },
        },
        quantity: { type: Number, required: true, min: 0 },
      },
    ],
    isNewest: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: "text", description: "text" });

const Product = mongoose.model("Product", productSchema);

export default Product;