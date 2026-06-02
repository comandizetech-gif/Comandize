import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

import connectDatabase from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import catalogRoutes from "./routes/catalogRoutes.js";
import catalogManagerRoutes from "./routes/catalogManagerRoutes.js";
import storeConfigRoutes from "./routes/storeConfigRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import deliveryPersonRoutes from "./routes/deliveryPersonRoutes.js";
import cashRegisterRoutes from "./routes/cashRegisterRoutes.js";
import subAccountRoutes from "./routes/subAccountRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsPath = path.resolve("uploads");

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

connectDatabase();

app.use(
  "/uploads",
  express.static(uploadsPath, {
    maxAge: "30d",
    etag: true,
    immutable: true,
  })
);

app.get("/", (req, res) => {
  res.json({
    message: "Servidor Comandize Online 🚀",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/catalog-manager", catalogManagerRoutes);
app.use("/api/store-config", storeConfigRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/delivery-persons", deliveryPersonRoutes);
app.use("/api/cash-register", cashRegisterRoutes);
app.use("/api/sub-accounts", subAccountRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Rota não encontrada",
    method: req.method,
    url: req.originalUrl,
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});