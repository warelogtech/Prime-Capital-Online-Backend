import express from 'express';
import { initiateTransfer } from '../services/initiateTransfer.js';
import { verifyTransferOtp } from '../services/verifyTransferOtp.js';

const router = express.Router();

router.post('/initiate', async (req, res) => {
  const { recipient, amount, reason } = req.body;
  try {
    const result = await initiateTransfer(recipient, amount, reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Transfer initiation failed', error });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { transfer_code, otp } = req.body;
  try {
    const result = await verifyTransferOtp(transfer_code, otp);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'OTP verification failed', error });
  }
});

export default router;
