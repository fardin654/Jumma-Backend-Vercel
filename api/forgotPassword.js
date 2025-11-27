export const config = { runtime: "nodejs" };

import { connectDB } from "../utils/db.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import sendMail from "../utils/sendMail.js";

export default async function handler(req, res) {
  await connectDB();
  const { method } = req;
  const action = req.query.action;

  // ==========================================================
  // 1. SEND OTP  →  POST /api/forgot-password?action=send-otp
  // ==========================================================
  if (method === "POST" && action === "send-otp") {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user)
        return res.status(404).json({ message: "User not found" });

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetOTP = otp;
      user.otpExpiry = Date.now() + 10 * 60 * 1000; // valid for 10 minutes
      await user.save();

      // Send OTP Email
      await sendMail(email, "Password Reset OTP", `Your OTP is ${otp}`);

      return res.status(200).json({ message: "OTP sent to email" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // =================================================================
  // 2. VERIFY OTP  →  POST /api/forgot-password?action=verify-otp
  // =================================================================
  if (method === "POST" && action === "verify-otp") {
    try {
      const { email, otp } = req.body;
      const user = await User.findOne({ email });

      if (!user)
        return res.status(404).json({ message: "User not found" });

      const isExpired = Date.now() > user.otpExpiry;

      if (user.resetOTP !== otp || isExpired)
        return res
          .status(400)
          .json({ message: "Invalid or expired OTP" });

      return res.status(200).json({ message: "OTP verified successfully" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // =====================================================================
  // 3. RESET PASSWORD → POST /api/forgot-password?action=reset-password
  // =====================================================================
  if (method === "POST" && action === "reset-password") {
    try {
      const { email, otp, newPassword } = req.body;
      const user = await User.findOne({ email });

      if (!user)
        return res.status(404).json({ message: "User not found" });

      const isExpired = Date.now() > user.otpExpiry;

      if (user.resetOTP !== otp || isExpired)
        return res
          .status(400)
          .json({ message: "Invalid or expired OTP" });

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(newPassword, salt);

      user.password = hashed;
      user.resetOTP = undefined;
      user.otpExpiry = undefined;
      await user.save();

      return res.status(200).json({ message: "Password reset successfully" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // =====================================================================
  // Invalid action or method
  // =====================================================================
  return res.status(405).json({ message: "Invalid action or method" });
}
