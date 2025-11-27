export const config = { runtime: "nodejs" };

import { connectDB } from "../utils/db.js";
import Wallet from "../models/wallet.js";

export default async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    try {
      const { AccessCode } = req.query;

      let walletData = await Wallet.findOne({ AccessCode });

      if (!walletData) {
        walletData = new Wallet({ Balance: 0, AccessCode });
        await walletData.save();
      }

      return res.status(200).json({ Balance: walletData.Balance });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { AccessCode } = req.body;
      const walletData = new Wallet({ Balance: 0, AccessCode });
      await walletData.save();
      return res.status(200).json("Wallet Created.");
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  return res.status(405).json({ message: "Method Not Allowed" });
}
