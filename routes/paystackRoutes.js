// routes/paystackRoutes.js
import express from 'express';
import { getMobileMoneyBanks } from '../controllers/paystackController.js';

const router = express.Router();

router.get('/paystack/mobile-money-banks', getMobileMoneyBanks);

export default router;
