// routes/userRoutes.js
import express from "express";
import { registerUser, getUsers, resetPassword, sendResetOtp, updateUser, deleteUser, verifyResetOtp, saveCustomerIdentification, updateUserRole, getUserByPhoneNumber } from "../controllers/userController.js";
import upload from '../middleware/upload.js';

const router = express.Router();

// Use the uploadPhoto middleware before your registerUser controller
router.post('/register', upload, registerUser);
router.get("/users", getUsers);
router.delete("/users/:customer_id", deleteUser);
router.put('/users/:customer_id', upload, updateUser);
router.put('/update-role/:customer_id', updateUserRole);
router.post('/customeridentity', saveCustomerIdentification);
router.post('/send-reset-otp', sendResetOtp);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);
router.get('/users/:phoneNumber', getUserByPhoneNumber);

export default router;
