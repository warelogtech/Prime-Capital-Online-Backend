// server.js
import app from "./app.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import logger from './logger/logger.js'; // ✅ Already configured logger

// Load environment variables
dotenv.config();

// Ensure the logs directory exists
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Log an initial info message
logger.info('🚀 Server starting...');

// Get the port and Mongo URI from environment variables
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    logger.info("✅ Connected to MongoDB");

    // Start the server after successful DB connection
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    logger.error("❌ MongoDB connection failed: " + error.message);
  });
