import express from "express";
import { authMiddleware, requireAdminAccount } from "../middlewares/authMiddleware.js";
import { createSubAccount, deleteSubAccount, listSubAccounts, toggleSubAccountStatus, updateSubAccount } from "../controllers/subAccountController.js";

const router = express.Router();

router.get("/", authMiddleware, requireAdminAccount, listSubAccounts);
router.post("/", authMiddleware, requireAdminAccount, createSubAccount);
router.put("/:id", authMiddleware, requireAdminAccount, updateSubAccount);
router.patch("/:id/toggle-status", authMiddleware, requireAdminAccount, toggleSubAccountStatus);
router.delete("/:id", authMiddleware, requireAdminAccount, deleteSubAccount);

export default router;
