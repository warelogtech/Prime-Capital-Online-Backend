// routes/userRoutes.js
import express from "express";
import { registerUser, getUsers, resetPassword, sendResetOtp, updateUser, deleteUser, verifyResetOtp, saveCustomerIdentification, updateUserRole, getUserByPhoneNumber } from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.get("/users", getUsers);
router.delete("/users/:cust_id", deleteUser);
router.put('/users/:cust_id', updateUser);
router.put('/update-role/:customerId', updateUserRole);
router.post('/customeridentity', saveCustomerIdentification);
router.post('/send-reset-otp', sendResetOtp);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);
router.get('/users/:phoneNumber', getUserByPhoneNumber);

export default router;
