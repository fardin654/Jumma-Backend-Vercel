const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
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

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/members', require('../routes/members'));
app.use('/api/expenses', require('../routes/expenses'));
app.use('/api/rounds', require('../routes/rounds'));
app.use('/api/wallets', require('../routes/wallet'));
app.use('/api/payments', require('../routes/payments'));
app.use('/api/contacts', require('../routes/contacts'));
app.use('/api/user', require('../routes/users'));
app.use('/api/requests', require('../routes/requests'));
app.use('/api/forgot-password', require('../routes/forgotPassword'));

module.exports = app;
