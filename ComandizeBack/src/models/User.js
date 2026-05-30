import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["ADMIN", "MANAGER", "ATTENDANT", "KITCHEN", "DELIVERY", "CLIENT"],
      default: "ADMIN",
    },

    active: {
      type: Boolean,
      default: false,
    },

    storeName: {
      type: String,
      required: true,
      trim: true,
    },

    catalogUrl: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);