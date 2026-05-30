import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    catalogUrl: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },

    whatsapp: {
      type: String,
      required: true,
      maxlength: 20,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    cpf: {
      type: String,
      default: "",
      maxlength: 11,
    },

    deliveryAddress: {
      street: { type: String, maxlength: 120, default: "" },
      neighborhood: { type: String, maxlength: 80, default: "" },
      houseNumber: { type: String, maxlength: 20, default: "" },
      cep: { type: String, maxlength: 8, default: "" },
    },

    points: {
      type: Number,
      default: 0,
      min: 0,
    },

    cashbackBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    referralCode: {
      type: String,
      required: true,
      unique: true,
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    referralValidUntil: {
      type: Date,
      default: null,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

customerSchema.index({ store: 1, whatsapp: 1 }, { unique: true });

export default mongoose.model("Customer", customerSchema);
