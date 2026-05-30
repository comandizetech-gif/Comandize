import mongoose from "mongoose";

const deliveryPersonSchema = new mongoose.Schema(
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

    whatsapp: {
      type: String,
      required: true,
      maxlength: 20,
      trim: true,
    },

    address: {
      type: String,
      maxlength: 80,
      trim: true,
      default: "",
    },

    salary: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Quanto a loja paga para esse entregador por KM rodado.
    earningPerKm: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Percentual opcional sobre a taxa de entrega do pedido.
    deliveryPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

deliveryPersonSchema.index({ user: 1, whatsapp: 1 }, { unique: true });

export default mongoose.model("DeliveryPerson", deliveryPersonSchema);
