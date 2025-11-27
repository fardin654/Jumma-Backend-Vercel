export const config = { runtime: "nodejs" };

import { connectDB } from "../utils/db.js";
import Contacts from "../models/Contacts.js";

export default async function handler(req, res) {
  await connectDB();

  const { method } = req;

  // ----------------------------
  // GET /api/contacts
  // ----------------------------
  if (method === "GET") {
    try {
      const { AccessCode } = req.query;
      const members = await Contacts.find({ AccessCode });
      return res.status(200).json(members);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ----------------------------
  // POST /api/contacts
  // ----------------------------
  if (method === "POST") {
    try {
      const member = new Contacts({
        name: req.body.name,
        contact: req.body.contact || "0",
        description: req.body.description || "",
        AccessCode: req.body.AccessCode
      });

      const newMember = await member.save();
      return res.status(201).json(newMember);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  // ----------------------------
  // PATCH /api/contacts/:id
  // ----------------------------
  if (method === "PATCH") {
    try {
      const { id } = req.query;
      const member = await Contacts.findById(id);

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      if (req.body.name !== undefined) member.name = req.body.name;
      if (req.body.contact !== undefined) member.contact = req.body.contact;
      if (req.body.description !== undefined) member.description = req.body.description;

      const updatedMember = await member.save();
      return res.status(200).json(updatedMember);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  // ----------------------------
  // DELETE /api/contacts/:id
  // ----------------------------
  if (method === "DELETE") {
    try {
      const { id } = req.query;
      const deleted = await Contacts.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(404).json({ message: "Contact not found" });
      }

      return res.status(200).json({ message: "Contact deleted successfully" });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ----------------------------
  // Method Not Allowed
  // ----------------------------
  return res.status(405).json({ message: "Method Not Allowed" });
}
