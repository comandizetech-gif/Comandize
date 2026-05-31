import mongoose from "mongoose";

const cutOptions = [
  "Nenhum",
  "Bife",
  "Moida",
  "Picadinho",
  "Assado",
  "Congelado",
  "Strogonof",
  "Corte Grelha",
  "Quente",
  "Gelado",
];

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

    cuts: {
      type: [String],
      enum: cutOptions,
      default: ["Nenhum"],
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
