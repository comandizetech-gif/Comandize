import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";

import {
  listSections,
  createSection,
  updateSectionDisplayMode,
  searchProducts,
  addProductToSection,
  updateCatalogItem,
  removeProductFromSection,
  deleteSection,
} from "../controllers/catalogManagerController.js";

const router = express.Router();

router.get("/sections", authMiddleware, listSections);
router.post("/sections", authMiddleware, createSection);
router.put("/sections/:sectionId/display-mode", authMiddleware, updateSectionDisplayMode);
router.delete("/sections/:sectionId", authMiddleware, deleteSection);

router.get("/products/search", authMiddleware, searchProducts);

router.post("/sections/:sectionId/products", authMiddleware, addProductToSection);

router.put("/sections/:sectionId/items/:itemId", authMiddleware, updateCatalogItem);

router.delete("/sections/:sectionId/items/:itemId", authMiddleware, removeProductFromSection);

export default router;