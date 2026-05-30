import mongoose from "mongoose";

const cashRegisterSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    operatorName: { type: String, maxlength: 80, trim: true, default: "" },
    openingAmount: { type: Number, default: 0, min: 0 },
    closingAmount: { type: Number, default: null, min: 0 },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" },
  },
  { timestamps: true }
);

cashRegisterSchema.index({ store: 1, openedAt: -1 });
cashRegisterSchema.index({ store: 1, status: 1 });

export default mongoose.model("CashRegister", cashRegisterSchema);
