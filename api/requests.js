export const config = { runtime: "nodejs" };

import { connectDB } from "../utils/db.js";
import Member from "../models/Member.js";
import Payment from "../models/Payments.js";
import Expense from "../models/Expense.js";
import Request from "../models/Requests.js";
import Round from "../models/Round.js";
import Wallet from "../models/wallet.js";

export default async function handler(req, res) {
  await connectDB();
  const { method } = req;
  const action = req.query.action;

  // ==========================================================================================
  // 1. GET ALL REQUESTS OF A MEMBER
  // GET /api/requests?action=member&memberId=123
  // ==========================================================================================
  if (method === "GET" && action === "member") {
    try {
      const { memberId } = req.query;
      const requests = await Request.find({ member: memberId })
        .sort({ date: -1 });

      return res.status(200).json({ requests });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ==========================================================================================
  // 2. GET ALL REQUESTS FOR ADMIN
  // GET /api/requests?action=admin&AccessCode=NIT
  // ==========================================================================================
  if (method === "GET" && action === "admin") {
    try {
      const { AccessCode } = req.query;
      const requests = await Request.find({ AccessCode })
        .sort({ date: -1 });

      return res.status(200).json({ requests });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ==========================================================================================
  // 3. CREATE NEW REQUEST
  // POST /api/requests
  // ==========================================================================================
  if (method === "POST") {
    try {
      const { memberId, date, amount, roundId, paymentType, AccessCode } = req.body;

      const request = new Request({
        member: memberId,
        date,
        amount,
        roundId,
        paymentType,
        AccessCode,
        isApproved: "pending"
      });

      const newRequest = await request.save();
      return res.status(201).json(newRequest);

    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ==========================================================================================
  // 4. APPROVE / REJECT REQUEST
  // PATCH /api/requests?id=123
  // ==========================================================================================
  if (method === "PATCH") {
    try {
      const { id } = req.query;
      const { isApproved, AccessCode } = req.body;

      const request = await Request.findById(id);
      if (!request)
        return res.status(404).json({ message: "Request not found" });

      request.isApproved = isApproved;
      await request.save();

      // REJECT CASE
      if (isApproved === "false") {
        return res.json({ message: "Request rejected", requestId: id });
      }

      // APPROVE CASE
      const member = await Member.findById(request.member);
      if (!member)
        return res.status(404).json({ message: "Member not found" });

      const round = await Round.findById(request.roundId);
      if (!round)
        return res.status(404).json({ message: "Round not found" });

      const wallet = await Wallet.findOne({ AccessCode });
      if (!wallet)
        return res.status(404).json({ message: "Wallet not found" });

      const amount = request.amount;

      // ================== Update Existing Payment or Create New ==================
      const existingIndex = round.payments.findIndex(
        (p) => p.member.toString() === request.member.toString()
      );

      const newPayment = {
        member: request.member,
        amount,
        date: request.date || Date.now(),
        status:
          amount >= round.fixedAmount
            ? "paid"
            : amount > 0
            ? "partial"
            : "pending",
        leftToPay: Math.max(0, round.fixedAmount - amount)
      };

      if (existingIndex >= 0) {
        round.payments[existingIndex].amount += amount;

        if (round.payments[existingIndex].status === "pending") {
          round.payments[existingIndex].date = new Date(request.date || Date.now());
        }

        round.payments[existingIndex].status =
          round.payments[existingIndex].amount >= round.fixedAmount
            ? "paid"
            : round.payments[existingIndex].amount > 0
            ? "partial"
            : "pending";

        round.payments[existingIndex].leftToPay = Math.max(
          0,
          round.fixedAmount - round.payments[existingIndex].amount
        );

        const diff = round.payments[existingIndex].amount - round.fixedAmount;
        member.balance = diff;
      } else {
        round.payments.push(newPayment);
        member.balance += amount - round.fixedAmount;
      }

      const paymentRecord = new Payment({
        member: request.member,
        date: request.date || Date.now(),
        amount,
        round: request.round || round.roundNumber,
        AccessCode
      });

      wallet.Balance += amount;
      round.Balance = round.payments.reduce((sum, p) => sum + p.amount, 0);

      const [savedWallet, savedRound, savedPayment, savedMember] =
        await Promise.all([
          wallet.save(),
          round.save(),
          paymentRecord.save(),
          member.save()
        ]);

      // ================== Expense Handling ==================
      if (request.paymentType === "expense") {
        savedWallet.Balance -= amount;

        const expense = new Expense({
          description: `Paid by: ${member.name}`,
          amount,
          balanceLeft: savedWallet.Balance,
          date: request.date || Date.now(),
          AccessCode
        });

        savedRound.Expenses.push(expense);
        round.totalExpenses = savedRound.Expenses.reduce((s, e) => s + e.amount, 0);

        await expense.save();
        await savedWallet.save();
        await savedRound.save();

        return res.status(201).json({
          message: "Payment approved",
          requestId: id,
          member: savedMember,
          wallet: savedWallet,
          round: savedRound,
          payment: savedPayment
        });
      }

      // ================== Normal Payment Response ==================
      return res.status(200).json({
        message: "Payment approved",
        requestId: id,
        member: savedMember,
        wallet: savedWallet,
        round: savedRound,
        payment: savedPayment
      });

    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ==========================================================================================
  // Invalid Action / Method
  // ==========================================================================================
  return res.status(405).json({ message: "Invalid action or method" });
}
