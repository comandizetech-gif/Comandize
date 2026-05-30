import mongoose from "mongoose";

const deliverySettingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Taxa mínima cobrada do cliente quando a entrega tiver até minKmIncluded.
    minimumFee: {
      type: Number,
      default: 3,
      min: 0,
    },

    // Exemplo: até 1 km cobra minimumFee.
    minKmIncluded: {
      type: Number,
      default: 1,
      min: 0,
    },

    // Valor cobrado do cliente por km acima da franquia mínima.
    pricePerKm: {
      type: Number,
      default: 2,
      min: 0,
    },

    // Taxa extra opcional da loja. Ex.: embalagem, ponte, chuva, bairro distante.
    extraFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

deliverySettingSchema.index({ user: 1 });

export default mongoose.model("DeliverySetting", deliverySettingSchema);
