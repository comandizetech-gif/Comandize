import express from "express";
import { getPublicCatalog } from "../controllers/catalogController.js";

const router = express.Router();

// Funciona tanto para:
// /api/catalog/sanrafael
// /api/catalog/carnessanrafael.com.br
router.get("/:catalogUrl", getPublicCatalog);

export default router;
