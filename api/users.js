export const config = { runtime: "nodejs" };

import { connectDB } from "../utils/db.js";
import Users from "../models/User.js";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  await connectDB();
  const { method } = req;

  // ================================
  // REGISTER  → POST /api/users/register
  // ================================
  if (method === "POST" && req.query.action === "register") {
    try {
      const { username, email, password, AccessCode } = req.body;

      const existingUser = await Users.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const existingCode = await Users.findOne({ AccessCode });
      if (existingCode) {
        return res
          .status(400)
          .json({ message: "Access Code already registered" });
      }

      // hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = new Users({
        username,
        email,
        password: hashedPassword,
        AccessCode,
      });

      await newUser.save();
      return res
        .status(201)
        .json({ message: "User registered successfully" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ================================
  // LOGIN  → POST /api/users/login
  // ================================
  if (method === "POST" && req.query.action === "login") {
    try {
      const { email, password } = req.body;

      // Allow login by email or by username
      const userEmail = await Users.findOne({ email });
      const userName = await Users.findOne({ username: email });

      if (!userEmail && !userName) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const user = userEmail || userName;

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      return res.status(200).json({ AccessCode: user.AccessCode });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ================================
  // AUTHENTICATE  → POST /api/users/authenticate
  // ================================
  if (method === "POST" && req.query.action === "authenticate") {
    try {
      const user = await Users.findOne({ AccessCode: req.body.AccessCode });

      if (!user) {
        return res.status(400).json({ message: "Authentication Failed" });
      }

      return res
        .status(200)
        .json({ message: "Authentication successful" });
    } catch {
      return res.status(400).json({ message: "Authentication Failed" });
    }
  }

  // If reaching here → method or action not supported
  return res.status(405).json({ message: "Invalid action or method" });
}
