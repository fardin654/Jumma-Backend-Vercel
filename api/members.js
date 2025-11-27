export const config = { runtime: "nodejs" };

import { connectDB } from "../utils/db.js";
import Member from "../models/Member.js";

export default async function handler(req, res) {
  await connectDB();
  const { method } = req;

  // ==========================================================
  // GET ALL MEMBERS → GET /api/members?AccessCode=NIT
  // ==========================================================
  if (method === "GET" && !req.query.id) {
    try {
      const { AccessCode } = req.query;
      const members = await Member.find({ AccessCode });
      return res.status(200).json(members);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ==========================================================
  // GET SPECIFIC MEMBER → GET /api/members?id=123
  // ==========================================================
  if (method === "GET" && req.query.id) {
    try {
      const { id } = req.query;
      const member = await Member.findById(id);

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      return res.status(200).json(member);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ==========================================================
  // CREATE MEMBER → POST /api/members
  // ==========================================================
  if (method === "POST") {
    try {
      const { name, balance, AccessCode } = req.body;

      const member = new Member({
        name,
        balance: balance || 0,
        AccessCode,
      });

      const newMember = await member.save();
      return res.status(201).json(newMember);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  // ==========================================================
  // UPDATE MEMBER → PATCH /api/members?id=123
  // ==========================================================
  if (method === "PATCH") {
    try {
      const { id } = req.query;
      const member = await Member.findById(id);

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      if (req.body.balance !== undefined)
        member.balance = req.body.balance;

      if (req.body.isNextToPay !== undefined)
        member.isNextToPay = req.body.isNextToPay;

      const updatedMember = await member.save();
      return res.status(200).json(updatedMember);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  // ==========================================================
  // DELETE MEMBER → DELETE /api/members?id=123
  // ==========================================================
  if (method === "DELETE") {
    try {
      const { id } = req.query;
      const member = await Member.findByIdAndDelete(id);

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      return res.status(200).json({ message: "Member deleted successfully" });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ==========================================================
  // INVALID METHOD
  // ==========================================================
  return res.status(405).json({ message: "Method Not Allowed" });
}
