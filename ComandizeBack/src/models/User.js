import mongoose from "mongoose";

const pagePermissionSchema = new mongoose.Schema(
  {
    page: {
      type: String,
      required: true,
      enum: [
        "Delivery",
        "Pedidos",
        "Históricos",
        "Produtos",
        "Catálogo Online",
        "Clientes",
        "Relatórios",
        "Entregadores",
        "Configuração",
      ],
    },
    canView: { type: Boolean, default: true },
    canManage: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    password: { type: String, required: true },
    phone: { type: String, default: "", trim: true, maxlength: 20 },
    role: {
      type: String,
      enum: ["ADMIN", "MANAGER", "ATTENDANT", "KITCHEN", "DELIVERY", "CLIENT"],
      default: "ADMIN",
    },
    active: { type: Boolean, default: false },
    storeName: { type: String, required: true, trim: true, maxlength: 120 },
    catalogUrl: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 80 },

    // Domínio próprio do cliente. Ex: carnessanrafael.com.br
    // Use sem https:// e sem barra no final.
    customDomain: { type: String, default: "", lowercase: true, trim: true, maxlength: 160 },

    parentStore: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    isSubAccount: { type: Boolean, default: false, index: true },
    permissions: { type: [pagePermissionSchema], default: [] },
  },
  { timestamps: true }
);

userSchema.index(
  { customDomain: 1 },
  {
    unique: true,
    partialFilterExpression: { customDomain: { $type: "string", $gt: "" } },
  }
);
userSchema.index({ parentStore: 1, email: 1 });
userSchema.index({ parentStore: 1, active: 1 });

export default mongoose.model("User", userSchema);
