export const config = { runtime: "nodejs" };

import { connectDB } from "../utils/db.js";
import Expense from "../models/Expense.js";
import Round from "../models/Round.js";

export default async function handler(req, res) {
  await connectDB();

  const { method } = req;

  // --------------------------
  // Add new expense (POST)
  // --------------------------
  if (method === "POST") {
    try {
      const { description, amount, paidBy, roundId, AccessCode } = req.body;

      const expense = new Expense({
        description,
        amount,
        paidBy,
        roundId,
        AccessCode
      });

      const newExpense = await expense.save();

      // If expense belongs to a round, update the round's totalExpenses
      if (roundId) {
        await Round.findByIdAndUpdate(roundId, {
          $inc: { totalExpenses: amount }
        });
      }

      return res.status(201).json(newExpense);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  // --------------------------
  // Get all expenses (GET)
  // --------------------------
  if (method === "GET") {
    try {
      const { AccessCode } = req.query;

      const expenses = await Expense.find({ AccessCode }).populate(
        "paidBy",
        "name"
      );

      return res.status(200).json(expenses);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // --------------------------
  // Invalid method
  // --------------------------
  return res.status(405).json({ message: "Method Not Allowed" });
}
