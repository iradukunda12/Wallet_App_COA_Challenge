import { getMonthName } from "../libs/index.js";
import pool from "../libs/database.js";

export const getTransactions = async (req, res) => {
  try {
    const today = new Date();
    const _sevenDaysAgo = new Date(today);
    _sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysAgo = _sevenDaysAgo.toISOString().split("T")[0];

    const { df, dt, s } = req.query;
    const { userId } = req.body.user;

    console.log("User ID:", userId);
    console.log("Date Range:", {
      start: df || sevenDaysAgo,
      end: dt || today.toISOString().split("T")[0],
    });
    console.log("Search term:", s || "");

    const startDate = new Date(df || sevenDaysAgo);
    const endDate = new Date(dt || new Date());

    const query = {
      text: `
        SELECT * FROM tbltransaction 
        WHERE user_id = $1 
        AND createdat BETWEEN $2 AND $3
        ${
          s
            ? "AND (description ILIKE $4 OR status ILIKE $4 OR source ILIKE $4)"
            : ""
        }
        ORDER BY id DESC
      `,
      values: s
        ? [userId, startDate, endDate, `%${s}%`]
        : [userId, startDate, endDate],
    };

    console.log("Query:", query);

    const transactions = await pool.query(query);

    console.log("Found transactions:", transactions.rows.length);

    if (transactions.rows.length === 0) {
      const checkUserTransactions = await pool.query(
        "SELECT COUNT(*) FROM tbltransaction WHERE user_id = $1",
        [userId]
      );

      console.log(
        "Total user transactions:",
        checkUserTransactions.rows[0].count
      );
    }

    res.status(200).json({
      status: "success",
      data: transactions.rows,
      metadata: {
        totalCount: transactions.rows.length,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        filters: {
          search: s || null,
        },
      },
    });
  } catch (error) {
    console.log("Error in getTransactions:", error);
    res.status(500).json({
      status: "failed",
      message: error.message,
      details: error.stack,
    });
  }
};

export const getDashboardInformation = async (req, res) => {
  try {
    const { userId } = req.body.user;

    let totalIncome = 0;
    let totalExpense = 0;

    const transactionsResult = await pool.query({
      text: `SELECT type, SUM(amount) AS totalAmount FROM 
    tbltransaction WHERE user_id = $1 GROUP BY type`,
      values: [userId],
    });

    const transactions = transactionsResult.rows;

    transactions.forEach((transaction) => {
      if (transaction.type === "income") {
        totalIncome += transaction.totalamount;
      } else {
        totalExpense += transaction.totalamount;
      }
    });

    const availableBalance = totalIncome - totalExpense;

    const year = new Date().getFullYear();
    const start_Date = new Date(year, 0, 1);
    const end_Date = new Date(year, 11, 31, 23, 59, 59);

    const result = await pool.query({
      text: `
      SELECT 
        EXTRACT(MONTH FROM createdat) AS month,
        type,
        SUM(amount) AS totalAmount 
      FROM 
        tbltransaction 
      WHERE 
        user_id = $1 
        AND createdat BETWEEN $2 AND $3 
      GROUP BY 
        EXTRACT(MONTH FROM createdat), type`,
      values: [userId, start_Date, end_Date],
    });

    const data = new Array(12).fill().map((_, index) => {
      const monthData = result.rows.filter(
        (item) => parseInt(item.month) === index + 1
      );

      const income =
        monthData.find((item) => item.type === "income")?.totalamount || 0;

      const expense =
        monthData.find((item) => item.type === "expense")?.totalamount || 0;

      return {
        label: getMonthName(index),
        income,
        expense,
      };
    });

    const lastTransactionsResult = await pool.query({
      text: `SELECT * FROM tbltransaction WHERE user_id = $1 ORDER BY id DESC LIMIT 5`,
      values: [userId],
    });

    const lastTransactions = lastTransactionsResult.rows;

    const lastAccountResult = await pool.query({
      text: `SELECT * FROM tblaccount WHERE user_id = $1 ORDER BY id DESC LIMIT 4`,
      values: [userId],
    });

    const lastAccount = lastAccountResult.rows;

    res.status(200).json({
      status: "success",
      availableBalance,
      totalIncome,
      totalExpense,
      chartData: data,
      lastTransactions,
      lastAccount,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const addTransaction = async (req, res) => {
  try {
    const { userId } = req.body.user;
    const { account_id } = req.params;
    const { description, source, amount } = req.body;
    const type = "expenses";

    if (!(description && source && amount)) {
      return res
        .status(403)
        .json({ status: "failed", message: "Provide Required Fields!" });
    }

    if (Number(amount) <= 0) {
      return res.status(403).json({
        status: "failed",
        message: "Amount should be greater than 0.",
      });
    }

    if (type === "expense") {
      const budgetStatus = await checkBudgetLimit(userId, amount);
      if (budgetStatus.exceeded) {
        const amountExceeded = Number(amount) - budgetStatus.remainingBudget;
        return res.status(403).json({
          status: "warning",
          message: "This transaction would exceed your monthly budget!",
          budgetDetails: {
            currentExpenses: budgetStatus.currentExpenses,
            monthlyBudget: budgetStatus.monthlyBudget,
            remainingBudget: budgetStatus.remainingBudget,
            amountExceeded: amountExceeded.toFixed(2),
            exceedanceMessage: `You are attempting to spend $${amountExceeded.toFixed(
              2
            )} more than your remaining budget.`,
          },
        });
      }
    }

    const result = await pool.query({
      text: `SELECT * FROM tblaccount WHERE id = $1`,
      values: [account_id],
    });

    const accountInfo = result.rows[0];

    if (!accountInfo) {
      return res
        .status(404)
        .json({ status: "failed", message: "Invalid account information." });
    }

    if (
      type === "expense" &&
      (accountInfo.account_balance <= 0 ||
        accountInfo.account_balance < Number(amount))
    ) {
      return res.status(403).json({
        status: "failed",
        message: "Transaction failed. Insufficient account balance.",
      });
    }

    await pool.query("BEGIN");

    try {
      const balanceUpdate =
        type === "expense" ? "account_balance - $1" : "account_balance + $1";
      await pool.query({
        text: `UPDATE tblaccount SET account_balance = ${balanceUpdate}, updatedat = CURRENT_TIMESTAMP WHERE id = $2`,
        values: [amount, account_id],
      });

      await pool.query({
        text: `INSERT INTO tbltransaction(user_id, description, type, status, amount, source) VALUES($1, $2, $3, $4, $5, $6)`,
        values: [userId, description, type, "Completed", amount, source],
      });

      await pool.query("COMMIT");

      const updatedBudgetStatus = await checkBudgetLimit(userId, 0);

      res.status(200).json({
        status: "success",
        message: "Transaction completed successfully.",
        budgetStatus: updatedBudgetStatus,
      });
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const transferMoneyToAccount = async (req, res) => {
  try {
    const { userId } = req.body.user;
    const { from_account, to_account, amount } = req.body;

    if (!(from_account || to_account || amount)) {
      return res.status(403).json({
        status: "failed",
        message: "Provide Required Fields!",
      });
    }

    const newAmount = Number(amount);

    if (newAmount <= 0)
      return res.status(403).json({
        status: "failed",
        message: "Amount should be grater than 0.",
      });

    const fromAccountResult = await pool.query({
      text: `SELECT * FROM tblaccount WHERE id = $1`,
      values: [from_account],
    });

    const fromAccount = fromAccountResult.rows[0];

    if (!fromAccount) {
      return res.status(404).json({
        status: "failed",
        message: "Account information not found.",
      });
    }

    if (newAmount > fromAccount.account_balance) {
      return res.status(403).json({
        status: "failed",
        message: "Transfer failed. Insufficient account balance.",
      });
    }

    await pool.query("BEGIN");

    await pool.query({
      text: `UPDATE tblaccount SET account_balance = account_balance - $1, updatedat = CURRENT_TIMESTAMP WHERE id = $2`,
      values: [newAmount, from_account],
    });

    const toAccount = await pool.query({
      text: `UPDATE tblaccount SET account_balance = account_balance + $1, updatedat = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      values: [newAmount, to_account],
    });

    const description = `Transfer (${fromAccount.account_name} - ${toAccount.rows[0].account_name})`;

    await pool.query({
      text: `INSERT INTO tbltransaction(user_id, description, type, status, amount, source) VALUES($1, $2, $3, $4, $5, $6)`,
      values: [
        userId,
        description,
        "expense",
        "Completed",
        amount,
        fromAccount.account_name,
      ],
    });

    const description1 = `Received (${fromAccount.account_name} - ${toAccount.rows[0].account_name})`;

    await pool.query({
      text: `INSERT INTO tbltransaction(user_id, description, type, status, amount, source) VALUES($1, $2, $3, $4, $5, $6)`,
      values: [
        userId,
        description1,
        "income",
        "Completed",
        amount,
        toAccount.rows[0].account_name,
      ],
    });

    await pool.query("COMMIT");

    res.status(201).json({
      status: "success",
      message: "Transfer completed successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "failed", message: error.message });
  }
};

const checkBudgetLimit = async (userId, amount) => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const budgetResult = await pool.query({
    text: `SELECT monthly_budget FROM tbluser WHERE id = $1`,
    values: [userId],
  });

  const monthlyBudget = budgetResult.rows[0]?.monthly_budget || 0;

  if (monthlyBudget === 0) return { exceeded: false };

  const expensesResult = await pool.query({
    text: `
      SELECT SUM(amount) as total_expense 
      FROM tbltransaction 
      WHERE user_id = $1 
      AND type = 'expense'
      AND EXTRACT(MONTH FROM createdat) = $2
      AND EXTRACT(YEAR FROM createdat) = $3
    `,
    values: [userId, currentMonth, currentYear],
  });

  const currentExpenses = Number(expensesResult.rows[0]?.total_expense || 0);
  const projectedTotal = currentExpenses + Number(amount);

  return {
    exceeded: projectedTotal > monthlyBudget,
    currentExpenses,
    monthlyBudget,
    remainingBudget: monthlyBudget - currentExpenses,
  };
};

export const setBudget = async (req, res) => {
  try {
    const { userId } = req.body.user;
    const { monthly_budget } = req.body;

    if (!monthly_budget || Number(monthly_budget) <= 0) {
      return res.status(403).json({
        status: "failed",
        message: "Please provide a valid monthly budget amount.",
      });
    }

    await pool.query({
      text: `UPDATE tbluser SET monthly_budget = $1 WHERE id = $2`,
      values: [monthly_budget, userId],
    });

    res.status(200).json({
      status: "success",
      message: "Monthly budget updated successfully",
      budget: monthly_budget,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const getBudgetStatus = async (req, res) => {
  try {
    const { userId } = req.body.user;
    const budgetStatus = await checkBudgetLimit(userId, 0);

    res.status(200).json({
      status: "success",
      budgetStatus,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "failed", message: error.message });
  }
};