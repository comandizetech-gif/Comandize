import express from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getMyCatalogStatus,
  getMyStoreConfig,
  updateCatalogStatus,
  updateMyStoreConfig,
} from "../controllers/storeConfigController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", authMiddleware, getMyStoreConfig);
router.put("/", authMiddleware, upload.single("bannerImage"), updateMyStoreConfig);
router.get("/status", authMiddleware, getMyCatalogStatus);
router.patch("/status", authMiddleware, updateCatalogStatus);

export default router;
