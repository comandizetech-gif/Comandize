import express from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  createProduct,
  listProducts,
  updateProduct,
  deleteProduct,
  addStock,
  getProductTypes,
  getProductsSyncStatus,
} from "../controllers/productController.js";

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

router.get("/types", authMiddleware, getProductTypes);
router.get("/sync-status", authMiddleware, getProductsSyncStatus);
router.get("/", authMiddleware, listProducts);
router.post("/", authMiddleware, upload.single("image"), createProduct);
router.put("/:id", authMiddleware, upload.single("image"), updateProduct);
router.patch("/:id/add-stock", authMiddleware, addStock);
router.delete("/:id", authMiddleware, deleteProduct);

export default router;
