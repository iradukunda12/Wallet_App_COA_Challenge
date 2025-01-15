import express from "express";
import {
  addTransaction,
  getDashboardInformation,
  getTransactions,
  transferMoneyToAccount,
  setBudget,
  getBudgetStatus,
} from "../controllers/transactionController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getTransactions);
router.get("/dashboard", authMiddleware, getDashboardInformation);
router.post("/add-transaction/:account_id", authMiddleware, addTransaction);
router.put("/transfer-money", authMiddleware, transferMoneyToAccount);
router.put("/set-budget", authMiddleware, setBudget);
router.get("/budget-status", authMiddleware, getBudgetStatus);

export default router;
