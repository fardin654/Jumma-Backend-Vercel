import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return;
  }

  const db = await mongoose.connect(process.env.MONGO_URI);
  isConnected = db.connections[0].readyState === 1;

  console.log("MongoDB Connected");
}
