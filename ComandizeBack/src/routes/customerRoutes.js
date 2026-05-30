import express from "express";

import { authMiddleware } from "../middlewares/authMiddleware.js";

import {
  registerCustomer,
  loginCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerProfile,
  getReferralMessage,

  createCustomerAdmin,
  listCustomersAdmin,
  listAnonymousCustomersAdmin,
  getCustomerDetailsAdmin,
  updateCustomerAdmin,
  updateCustomerBalanceAdmin,
} from "../controllers/customerController.js";

const router = express.Router();

/* ROTAS PÚBLICAS DO CLIENTE */
router.post("/register/:catalogUrl", registerCustomer);
router.post("/login/:catalogUrl", loginCustomer);
router.get("/profile/:customerId", getCustomerProfile);
router.put("/profile/:customerId", updateCustomer);
router.delete("/profile/:customerId", deleteCustomer);
router.get("/referral/:customerId", getReferralMessage);

/* ROTAS DO PAINEL ADMIN */
router.post("/admin", authMiddleware, createCustomerAdmin);
router.get("/admin", authMiddleware, listCustomersAdmin);

/* CLIENTES NÃO CADASTRADOS */
router.get(
  "/admin/anonymous",
  authMiddleware,
  listAnonymousCustomersAdmin
);

/* DETALHES / EDIÇÃO */
router.get("/admin/:customerId", authMiddleware, getCustomerDetailsAdmin);
router.put("/admin/:customerId", authMiddleware, updateCustomerAdmin);

router.patch(
  "/admin/:customerId/balance",
  authMiddleware,
  updateCustomerBalanceAdmin
);

export default router;
