export const config = { runtime: "nodejs" };

const express = require('express');
const cors = require('cors');
import { connectDB } from "utils/db.js";
require('dotenv').config();

const app = express();

// Middleware
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

//Mongodb Connection
await connectDB();

// Routes
app.use('/api/members', require('./members.js'));
app.use('/api/expenses', require('./expenses.js'));
app.use('/api/rounds', require('./rounds.js'));
app.use('/api/wallets', require('./wallet.js'));
app.use('/api/payments', require('./payments.js'));
app.use('/api/contacts', require('./contacts.js'));
app.use('/api/user', require('./users.js'));
app.use('/api/requests', require('./requests.js'));
app.use('/api/forgot-password', require('./forgotPassword.js'));

module.exports = app;
