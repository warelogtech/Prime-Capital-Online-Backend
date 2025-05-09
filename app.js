// app.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan"; // Optional: for detailed HTTP logging
import multer from "multer";
import path from "path";
import bodyParser from "body-parser";

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
import getBankCodeRoutes from "./routes/getBankCodeRoutes.js";
import inwardFundsTransferRoutes from './routes/inwardFundsTransferRoutes.js';

import logger from './logger/logger.js';

dotenv.config();

const app = express();

// Trust proxy to capture real IP addresses (useful behind load balancers or reverse proxies)
app.set('trust proxy', true);

// IP Logging Middleware
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  logger.info(`Incoming request from IP: ${ip}, URL: ${req.originalUrl}`);
  next();
});

// Optional: HTTP request logging using morgan (can be removed if not needed)
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Middleware to parse JSON requests
app.use(bodyParser.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());

// Configure multer to handle file uploads for profile picture
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure the 'uploads' folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)); // Unique file name
  },
});

const upload = multer({ storage });

// Example route using multer (optional – you can move this to a controller)
app.post('/api/upload-profile', upload.single('profilePic'), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");
  res.status(200).json({ message: "Profile picture uploaded successfully", filename: req.file.filename });
});

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
app.use('/api', getBankCodeRoutes);
app.use('/api/inwardfundstransfer', inwardFundsTransferRoutes);

// Optional Sample Route: Log specific login attempts
app.post('/api/login', (req, res) => {
  const userIp = req.ip || req.connection.remoteAddress;
  logger.info(`Login attempt from IP: ${userIp}`);
  res.send("Login route");
});

export default app;
