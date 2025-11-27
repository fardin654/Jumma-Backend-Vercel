export const config = { runtime: "nodejs" };

import { connectDB } from "../utils/db.js";

export default async function handler(req, res) {
  try {
    await connectDB();
    return res.status(200).json({
      status: "OK",
      message: "Jumma backend is running."
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
}
