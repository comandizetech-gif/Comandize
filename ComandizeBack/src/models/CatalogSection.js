import mongoose from "mongoose";

const catalogItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    visible: {
      type: Boolean,
      default: true,
    },

    description: {
      type: String,
      maxlength: 250,
      trim: true,
      default: "",
    },

    weightOptions: {
      type: [Number],
      default: [],
    },

    tags: {
      type: [String],
      default: [],
    },

    priority: {
      type: Number,
      default: 0,
    },

    availableDays: {
      type: [String],
      enum: [
        "domingo",
        "segunda",
        "terca",
        "quarta",
        "quinta",
        "sexta",
        "sabado",
      ],
      default: [
        "domingo",
        "segunda",
        "terca",
        "quarta",
        "quinta",
        "sexta",
        "sabado",
      ],
    },
  },
  { _id: true }
);

const catalogSectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      maxlength: 80,
      trim: true,
    },

    products: [catalogItemSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("CatalogSection", catalogSectionSchema);