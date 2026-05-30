import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  createDeliveryPerson,
  deleteDeliveryPerson,
  getDeliveryPerson,
  getDeliverySettings,
  listDeliveryPersons,
  simulateDeliveryFee,
  toggleDeliveryPersonStatus,
  updateDeliveryPerson,
  updateDeliverySettings,
} from "../controllers/deliveryPersonController.js";

const router = express.Router();

router.use(authMiddleware);

// ATENÇÃO: estas rotas precisam vir antes de /:id.
router.get("/settings", getDeliverySettings);
router.put("/settings", updateDeliverySettings);
router.post("/simulate-fee", simulateDeliveryFee);

router.get("/", listDeliveryPersons);
router.post("/", createDeliveryPerson);
router.get("/:id", getDeliveryPerson);
router.put("/:id", updateDeliveryPerson);
router.patch("/:id/toggle-status", toggleDeliveryPersonStatus);
router.delete("/:id", deleteDeliveryPerson);

export default router;
