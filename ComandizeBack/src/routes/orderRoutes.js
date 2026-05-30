import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  assignDeliveryPersonToOrder,
  createManualOrder,
  createPublicOrder,
  deleteOrder,
  finalizeOrder,
  getDailyReport,
  getMonthlyReport,
  getProductSalesReport,
  getReportsSyncStatus,
  listFinalizedOrders,
  listMyOrders,
  searchProductsForOrder,
  updateOrder,
  updateOrderStatus,
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/public/:catalogUrl", createPublicOrder);
router.post("/manual", authMiddleware, createManualOrder);
router.get("/my", authMiddleware, listMyOrders);
router.get("/finalized", authMiddleware, listFinalizedOrders);
router.get("/products/search", authMiddleware, searchProductsForOrder);
router.get("/reports/sync-status", authMiddleware, getReportsSyncStatus);
router.get("/reports/daily", authMiddleware, getDailyReport);
router.get("/reports/monthly", authMiddleware, getMonthlyReport);
router.get("/reports/products", authMiddleware, getProductSalesReport);
router.put("/:id", authMiddleware, updateOrder);
router.patch("/:id/status", authMiddleware, updateOrderStatus);
router.patch("/:id/finalize", authMiddleware, finalizeOrder);
router.patch("/:id/delivery-person", authMiddleware, assignDeliveryPersonToOrder);
router.delete("/:id", authMiddleware, deleteOrder);

export default router;
