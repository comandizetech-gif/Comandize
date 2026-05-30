import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  closeCashRegister,
  getCurrentCashRegister,
  openCashRegister,
} from "../controllers/cashRegisterController.js";

const router = express.Router();

router.get("/current", authMiddleware, getCurrentCashRegister);
router.post("/open", authMiddleware, openCashRegister);
router.patch("/close", authMiddleware, closeCashRegister);

export default router;
