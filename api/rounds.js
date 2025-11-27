export const config = { runtime: "nodejs" };

import { connectDB } from "../utils/db.js";
import Round from "../models/Round.js";
import Member from "../models/Member.js";
import Wallet from "../models/wallet.js";
import Payments from "../models/Payments.js";
import Expense from "../models/Expense.js";

export default async function handler(req, res) {
  await connectDB();
  const { method } = req;
  const action = req.query.action;

  // =========================================================================
  // 1. CREATE NEW ROUND
  // POST /api/rounds
  // =========================================================================
  if (method === "POST" && !action) {
    try {
      const { AccessCode, fixedAmount = 400, members: memberIds } = req.body;

      const members = await Member.find({ _id: { $in: memberIds }, AccessCode });

      const lastRound = await Round.findOne({ AccessCode }).sort({ roundNumber: -1 });
      const roundNumber = lastRound ? lastRound.roundNumber + 1 : 1;

      const payments = members.map((member) => {
        let lastPaymentDate = new Date();

        if (lastRound && lastRound.payments) {
          const lastPaid = lastRound.payments.find(
            (p) => p.member.toString() === member._id.toString()
          );
          if (lastPaid?.date) lastPaymentDate = lastPaid.date;
        }

        return {
          member: member._id,
          date: lastPaymentDate,
          amount: 0,
          leftToPay: fixedAmount,
          status: "pending",
        };
      });

      const round = new Round({
        roundNumber,
        date: new Date(),
        payments,
        isCompleted: false,
        fixedAmount,
        AccessCode,
      });

      const newRound = await round.save();
      return res.status(201).json(newRound);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  // =========================================================================
  // 2. GET ALL ROUNDS
  // GET /api/rounds?AccessCode=XYZ
  // =========================================================================
  if (method === "GET" && !req.query.id && !action) {
    try {
      const { AccessCode } = req.query;
      const rounds = await Round.find({ AccessCode })
        .populate("payments.member", "name")
        .sort({ date: -1 });

      return res.status(200).json(rounds);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // =========================================================================
  // 3. GET SPECIFIC ROUND
  // GET /api/rounds?id=ROUND_ID
  // =========================================================================
  if (method === "GET" && req.query.id) {
    try {
      const round = await Round.findById(req.query.id)
        .populate("payments.member", "name");

      if (!round)
        return res.status(404).json({ message: "Round not found" });

      return res.status(200).json(round);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // =========================================================================
  // 4. UPDATE PAYMENT OF A ROUND
  // PATCH /api/rounds?action=update-payment&roundId=&paymentId=
  // =========================================================================
  if (method === "PATCH" && action === "update-payment") {
    try {
      const { roundId, paymentId } = req.query;
      const round = await Round.findById(roundId);

      if (!round) return res.status(404).json({ message: "Round not found" });

      const payment = round.payments.id(paymentId);
      if (!payment)
        return res.status(404).json({ message: "Payment not found" });

      if (req.body.amount !== undefined) payment.amount = req.body.amount;
      if (req.body.status !== undefined) payment.status = req.body.status;
      if (req.body.balance !== undefined) payment.balance = req.body.balance;

      await round.save();
      return res.status(200).json(round);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  // =========================================================================
  // 5. COMPLETE A ROUND
  // PATCH /api/rounds?action=complete&id=ROUND_ID
  // =========================================================================
  if (method === "PATCH" && action === "complete") {
    try {
      const { id } = req.query;
      const round = await Round.findByIdAndUpdate(
        id,
        { isCompleted: true, endDate: new Date() },
        { new: true }
      );

      return res.status(200).json(round);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  // =========================================================================
  // 6. DELETE A ROUND
  // DELETE /api/rounds?id=ROUND_ID
  // =========================================================================
  if (method === "DELETE") {
    try {
      const { id } = req.query;
      const round = await Round.findByIdAndDelete(id);

      if (!round)
        return res.status(404).json({ message: "Round not found" });

      return res.status(200).json({
        message: "Round deleted successfully",
        round,
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // =========================================================================
  // 7. ADD PAYMENT TO A ROUND
  // POST /api/rounds?action=add-payment&roundId=
  // =========================================================================
  if (method === "POST" && action === "add-payment") {
    try {
      const { roundId } = req.query;
      const { amount, paidBy, date, paymentType, AccessCode } = req.body;

      const round = await Round.findById(roundId);
      if (!round) return res.status(404).json({ message: "Round not found" });

      const wallet = await Wallet.findOne({ AccessCode });
      if (!wallet) return res.status(404).json({ message: "Wallet not found" });

      const member = await Member.findById(paidBy);
      if (!member) return res.status(404).json({ message: "Member not found" });

      const existingIndex = round.payments.findIndex(
        (p) => p.member.toString() === paidBy
      );

      const newPayment = {
        member: paidBy,
        amount,
        date: date || Date.now(),
        status:
          amount >= round.fixedAmount
            ? "paid"
            : amount > 0
            ? "partial"
            : "pending",
        leftToPay: Math.max(0, round.fixedAmount - amount),
      };

      // UPDATE or CREATE PAYMENT
      if (existingIndex >= 0) {
        const p = round.payments[existingIndex];
        p.amount += amount;

        if (p.status === "pending")
          p.date = new Date(date || Date.now());

        p.status =
          p.amount >= round.fixedAmount
            ? "paid"
            : p.amount > 0
            ? "partial"
            : "pending";

        p.leftToPay = Math.max(0, round.fixedAmount - p.amount);
        member.balance = p.amount - round.fixedAmount;
      } else {
        round.payments.push(newPayment);
        member.balance += amount - round.fixedAmount;
      }

      const paymentRecord = new Payments({
        member: paidBy,
        date: date || Date.now(),
        amount,
        round: round.roundNumber,
        AccessCode,
      });

      round.Balance = round.payments.reduce((s, p) => s + p.amount, 0);

      if (paymentType === "expense") {
        const expense = {
          description: `Paid by: ${member.name}`,
          amount,
          balanceLeft: wallet.Balance,
          date: date || Date.now(),
          AccessCode,
        };

        round.Expenses.push(expense);
        round.totalExpenses = round.Expenses.reduce((s, e) => s + e.amount, 0);
      } else if (paymentType === "wallet") {
        wallet.Balance += amount;
      }

      const [savedWallet, savedRound, savedPayment, savedMember] =
        await Promise.all([
          wallet.save(),
          round.save(),
          paymentRecord.save(),
          member.save(),
        ]);

      return res.status(201).json({
        round: savedRound,
        walletBalance: savedWallet.Balance,
        payment: savedPayment,
        member: savedMember,
      });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  // =========================================================================
  // 8. ADD EXPENSE TO ROUND
  // POST /api/rounds?action=add-expense&roundId=
  // =========================================================================
  if (method === "POST" && action === "add-expense") {
    try {
      const { roundId } = req.query;
      const { description, amount, balanceLeft, date, AccessCode } = req.body;

      const round = await Round.findById(roundId);
      if (!round)
        return res.status(404).json({ message: "Round not found" });

      const wallet = await Wallet.findOne({ AccessCode });
      if (!wallet)
        return res.status(404).json({ message: "Wallet not found" });

      const expense = {
        description,
        amount,
        balanceLeft,
        date: date || Date.now(),
        AccessCode,
      };

      round.Expenses.push(expense);
      wallet.Balance -= amount;

      round.totalExpenses = round.Expenses.reduce((s, e) => s + e.amount, 0);

      await wallet.save();
      const updatedRound = await round.save();

      return res.status(201).json(updatedRound);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  // =========================================================================
  // INVALID METHOD
  // =========================================================================
  return res.status(405).json({ message: "Invalid action or method" });
}
