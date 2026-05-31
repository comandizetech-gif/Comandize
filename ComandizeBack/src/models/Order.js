import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    name: { type: String, required: true, maxlength: 80, trim: true },
    image: { type: String, default: "" },
    price: { type: Number, required: true, default: 0, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 30, default: 1 },
    weight: { type: Number, default: null },
    cut: { type: String, maxlength: 40, default: "", trim: true },
    observation: { type: String, maxlength: 250, default: "", trim: true },
    subtotal: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false }
);

const stockMovementSchema = new mongoose.Schema(
  {
    soldProduct: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
      name: { type: String, maxlength: 80, default: "" },
      sku: { type: String, maxlength: 80, default: "" },
    },
    stockProduct: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
      name: { type: String, maxlength: 80, default: "" },
      sku: { type: String, maxlength: 80, default: "" },
      currentStock: { type: Number, default: 0 },
    },
    itemWeight: { type: Number, default: null },
    itemQuantity: { type: Number, default: 1 },
    baseQuantityDeducted: { type: Number, default: 0 },
    lossPercent: { type: Number, default: 0 },
    lossQuantity: { type: Number, default: 0 },
    quantityDeducted: { type: Number, default: 0 },
    usedRecipe: { type: Boolean, default: false },
    recipeMode: { type: String, default: "NONE" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const deliverySchema = new mongoose.Schema(
  {
    distanceKm: { type: Number, default: 0, min: 0 },
    minimumFee: { type: Number, default: 0, min: 0 },
    minKmIncluded: { type: Number, default: 0, min: 0 },
    pricePerKm: { type: Number, default: 0, min: 0 },
    calculatedFee: { type: Number, default: 0, min: 0 },
    extraFee: { type: Number, default: 0, min: 0 },
    pricingMode: { type: String, enum: ["MANUAL", "AUTO_KM"], default: "MANUAL" },
    note: { type: String, maxlength: 120, default: "", trim: true },
  },
  { _id: false }
);

const deliveryPersonPaymentSchema = new mongoose.Schema(
  {
    distanceKm: { type: Number, default: 0, min: 0 },
    earningPerKm: { type: Number, default: 0, min: 0 },
    deliveryPercent: { type: Number, default: 0, min: 0, max: 100 },
    amountByKm: { type: Number, default: 0, min: 0 },
    amountByPercent: { type: Number, default: 0, min: 0 },
    totalToPay: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    catalogUrl: { type: String, required: true, maxlength: 80, lowercase: true, trim: true },
    customerAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    referralCodeUsed: { type: String, default: "", uppercase: true, trim: true },
    type: { type: String, enum: ["ENTREGA", "RETIRADA"], required: true },
    customer: {
      name: { type: String, required: true, maxlength: 80, trim: true },
      whatsapp: { type: String, required: true, maxlength: 13, trim: true },
    },
    address: {
      street: { type: String, maxlength: 120, default: "", trim: true },
      neighborhood: { type: String, maxlength: 80, default: "", trim: true },
      houseNumber: { type: String, maxlength: 20, default: "", trim: true },
      cep: { type: String, maxlength: 8, default: "", trim: true },
    },
    payment: {
      method: { type: String, enum: ["Dinheiro", "Cartão", "Pix", ""], default: "" },
      changeFor: { type: String, maxlength: 20, default: "", trim: true },
    },
    scheduledTime: { type: String, required: true, trim: true },
    storeMessage: { type: String, maxlength: 300, default: "", trim: true },
    items: {
      type: [orderItemSchema],
      default: [],
      validate: {
        validator(items) {
          const quantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
          return quantity <= 30;
        },
        message: "Pedido deve ter no máximo 30 unidades.",
      },
    },
    subtotal: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    cashbackUsed: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    delivery: { type: deliverySchema, default: () => ({}) },
    extraFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, default: 0, min: 0 },
    assignedDeliveryPerson: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPerson", default: null },
    assignedDeliveryPersonName: { type: String, maxlength: 80, default: "", trim: true },
    assignedDeliveryPersonWhatsapp: { type: String, maxlength: 20, default: "", trim: true },
    deliveryAssignedAt: { type: Date, default: null },
    deliveryPersonPayment: { type: deliveryPersonPaymentSchema, default: () => ({}) },
    stockMovements: { type: [stockMovementSchema], default: [] },
    finalizedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["PENDENTE", "ACEITO", "PREPARANDO", "SAIU_PARA_ENTREGA", "FINALIZADO", "CANCELADO"],
      default: "PENDENTE",
    },
  },
  { timestamps: true }
);

orderSchema.index({ store: 1, createdAt: -1 });
orderSchema.index({ store: 1, status: 1 });
orderSchema.index({ customerAccount: 1 });
orderSchema.index({ catalogUrl: 1 });
orderSchema.index({ assignedDeliveryPerson: 1 });
orderSchema.index({ store: 1, "delivery.distanceKm": 1 });

export default mongoose.model("Order", orderSchema);
