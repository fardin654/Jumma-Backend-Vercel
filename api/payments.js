export const config = { runtime: "nodejs" };

import { connectDB } from "../utils/db.js";
import Payment from "../models/Payments.js";

export default async function handler(req, res) {
  await connectDB();
  const { method } = req;

  // =====================================================================
  // 1. GET ALL PAYMENTS OF A MEMBER
  // Endpoint: GET /api/payments?action=member&memberId=123&AccessCode=NIT
  // =====================================================================
  if (method === "GET" && req.query.action === "member") {
    try {
      const { memberId, AccessCode } = req.query;

      if (!memberId)
        return res.status(400).json({ message: "memberId is required" });

      const payments = await Payment.find({
        member: memberId,
        AccessCode
      }).sort({ date: -1 });

      return res.status(200).json({ payments });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // =====================================================================
  // 2. GET ALL PAYMENTS OF A ROUND
  // Endpoint: GET /api/payments?action=round&roundNumber=2&AccessCode=NIT
  // =====================================================================
  if (method === "GET" && req.query.action === "round") {
    try {
      const { roundNumber, AccessCode } = req.query;

      if (!roundNumber)
        return res.status(400).json({ message: "roundNumber is required" });

      const payments = await Payment.find({
        round: Number(roundNumber),
        AccessCode
      }).sort({ date: -1 });

      return res.status(200).json({ payments });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // =====================================================================
  // Invalid Method or Missing Action
  // =====================================================================
  return res.status(405).json({ message: "Invalid action or method" });
}
