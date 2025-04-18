import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import siginRoutes from "./routes/siginRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import glTransactionRoutes from "./routes/glTransactionRoutes.js";
import purchaseRequestRoutes from './routes/purchaseRequestRoutes.js';
import paystackRoutes from './routes/paystackRoutes.js';
import webhook from './webhook.js';
import transferRoutes from './routes/transferRoutes.js';
import externalCreditRoutes from './routes/externalCreditRoutes.js';
import loanRepaymentRoutes from './routes/loanRepayment.js';
import './cronjobs/autoLoanRepayment.js';  
import locationRoutes from './routes/locationRoutes.js';
import logger from './logger/logger.js'; // Import the logger

dotenv.config();

const app = express();

// Middleware to log incoming requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Middleware for parsing JSON and enabling CORS
app.use(express.json());
app.use(cors());

// Routes
app.use("/api", userRoutes);
app.use("/api", siginRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/gl-transactions", glTransactionRoutes);
app.use('/api/purchase-requests', purchaseRequestRoutes);
app.use('/api/paystack', paystackRoutes);
app.use('/api', webhook);
app.use('/api/transfer', transferRoutes);
app.use('/api/external', externalCreditRoutes);
app.use('/api', loanRepaymentRoutes);
app.use('/api/locations', locationRoutes);

// Correct export statement
export default app;
