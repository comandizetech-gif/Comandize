import mongoose from "mongoose";

const recipeItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.001,
      default: 1,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
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

    sku: {
      type: String,
      required: true,
      maxlength: 80,
      trim: true,
    },

    barcode: {
      type: String,
      maxlength: 80,
      trim: true,
      default: "",
    },

    companyName: {
      type: String,
      maxlength: 80,
      trim: true,
      default: "",
    },

    measureType: {
      type: String,
      enum: ["UNIDADE", "KILO"],
      default: "UNIDADE",
    },

    image: {
      type: String,
      default: "",
    },

    productType: {
      type: String,
      required: true,
      maxlength: 80,
      trim: true,
    },

    showInCatalog: {
      type: Boolean,
      default: false,
    },

    catalogSection: {
      type: String,
      maxlength: 80,
      trim: true,
      default: "",
    },

    entryPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    salePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    clientPrice: {
      type: Number,
      default: null,
      min: 0,
    },

    cashbackPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    lossPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    promotionalPrice: {
      type: Number,
      default: null,
      min: 0,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    active: {
      type: Boolean,
      default: true,
    },

    priority: {
      type: Number,
      default: 0,
    },

    recipeEnabled: {
      type: Boolean,
      default: false,
    },

    recipeItems: {
      type: [recipeItemSchema],
      default: [],
    },

    // Campos antigos mantidos para não quebrar produtos já salvos.
    recipeSourceProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    recipeDeductQuantity: {
      type: Number,
      default: 1,
      min: 0,
    },
  },
  { timestamps: true }
);

// Índices principais.
// Removido "index: true" do campo user para evitar aviso de índice duplicado.
productSchema.index({ user: 1, sku: 1 }, { unique: true });
productSchema.index({ user: 1, name: 1 });
productSchema.index({ user: 1, stock: 1 });
productSchema.index({ user: 1, productType: 1 });
productSchema.index({ user: 1, "recipeItems.product": 1 });

export default mongoose.model("Product", productSchema);
