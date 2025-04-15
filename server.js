// server.js
import app from "./app.js";
import mongoose from "mongoose";
import dotenv from "dotenv";



dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose
    .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("✅ Connected to MongoDB");

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("❌ MongoDB connection failed:", error.message);
    });
