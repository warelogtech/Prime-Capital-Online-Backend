import express from 'express';
import { signinUser, verifyOtp, signoutUser, deleteAccount } from '../controllers/signinController.js';

const router = express.Router();

// Sign-in route
router.post('/login', signinUser);

// OTP verification route
router.post('/verify-otp', verifyOtp);

// Sign-out route
router.post('/signout', signoutUser);

// Delete account route
router.delete('/delete-account', deleteAccount);

export default router;
