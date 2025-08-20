const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/members', require('../backend/routes/members'));
app.use('/api/expenses', require('../backend/routes/expenses'));
app.use('/api/rounds', require('../backend/routes/rounds'));
app.use('/api/wallets', require('../backend/routes/wallet'));
app.use('/api/payments', require('../backend/routes/payments'));

module.exports = app;
