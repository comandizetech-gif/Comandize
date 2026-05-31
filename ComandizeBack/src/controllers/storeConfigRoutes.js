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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, cb) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Formato de imagem inválido. Use JPEG, PNG ou WEBP."));
    }

    return cb(null, true);
  },
});

router.get("/", authMiddleware, getMyStoreConfig);
router.put("/", authMiddleware, upload.single("bannerImage"), updateMyStoreConfig);
router.get("/status", authMiddleware, getMyCatalogStatus);
router.patch("/status", authMiddleware, updateCatalogStatus);

export default router;
