import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
} from "../controllers/pushController.js";

const router = express.Router();

router.get("/public-key", getVapidPublicKey);
router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", authMiddleware, subscribePush);
router.post("/unsubscribe", authMiddleware, unsubscribePush);

export default router;
