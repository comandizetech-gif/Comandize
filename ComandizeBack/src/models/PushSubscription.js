import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    endpoint: {
      type: String,
      required: true,
      unique: true,
    },

    expirationTime: {
      type: Number,
      default: null,
    },

    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },

    userAgent: {
      type: String,
      maxlength: 300,
      default: "",
    },

    active: {
      type: Boolean,
      default: true,
    },

    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ store: 1, active: 1 });
pushSubscriptionSchema.index({ user: 1, active: 1 });

export default mongoose.model("PushSubscription", pushSubscriptionSchema);
