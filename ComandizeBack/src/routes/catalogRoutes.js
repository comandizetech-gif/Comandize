import express from "express";
import { getPublicCatalog } from "../controllers/catalogController.js";

const router = express.Router();

router.get("/:catalogUrl", getPublicCatalog);

export default router;