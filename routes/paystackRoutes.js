import express from 'express';
import {
  getMobileMoneyBanks,
  createTransferRecipient,
  initiateBulkTransfer
} from '../controllers/paystackController.js';

const router = express.Router();

router.get('/banks', getMobileMoneyBanks);
router.post("/recipient", createTransferRecipient);
router.post('/bulk-transfer', initiateBulkTransfer);

export default router;
