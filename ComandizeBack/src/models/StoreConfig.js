import mongoose from "mongoose";

const dayScheduleSchema = new mongoose.Schema(
  {
    active: { type: Boolean, default: true },
    open: { type: String, default: "08:00" },
    lunchStart: { type: String, default: "" },
    lunchEnd: { type: String, default: "" },
    close: { type: String, default: "18:00" },
    hasLunchBreak: { type: Boolean, default: false },
  },
  { _id: false }
);

const storeConfigSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    bannerImage: { type: String, default: "" },
    title: { type: String, maxlength: 80, default: "" },
    subtitle: { type: String, maxlength: 120, default: "" },
    address: { type: String, maxlength: 160, default: "" },

    // AUTO = usa horário cadastrado. OPEN/CLOSED = força apenas no dia atual.
    // No dia seguinte volta automaticamente a respeitar os horários.
    manualCatalogStatus: {
      type: String,
      enum: ["AUTO", "OPEN", "CLOSED"],
      default: "AUTO",
    },

    manualCatalogDate: {
      type: String,
      default: "",
    },

    schedules: {
      domingo: { type: dayScheduleSchema, default: () => ({ active: false }) },
      segunda: { type: dayScheduleSchema, default: () => ({}) },
      terca: { type: dayScheduleSchema, default: () => ({}) },
      quarta: { type: dayScheduleSchema, default: () => ({}) },
      quinta: { type: dayScheduleSchema, default: () => ({}) },
      sexta: { type: dayScheduleSchema, default: () => ({}) },
      sabado: { type: dayScheduleSchema, default: () => ({ active: false }) },
    },
  },
  { timestamps: true }
);

export default mongoose.model("StoreConfig", storeConfigSchema);
