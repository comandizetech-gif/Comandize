import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDatabase from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import catalogRoutes from "./routes/catalogRoutes.js";
import catalogManagerRoutes from "./routes/catalogManagerRoutes.js";
import storeConfigRoutes from "./routes/storeConfigRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import customerRoutes from "./routes/customerRoutes.js"; //Sistema de rregistro
import deliveryPersonRoutes from "./routes/deliveryPersonRoutes.js";
import cashRegisterRoutes from "./routes/cashRegisterRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDatabase();

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


app.use((req, res) => {
  res.status(404).json({
    message: "Rota não encontrada",
    method: req.method,
    url: req.originalUrl,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});