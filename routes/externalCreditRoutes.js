import express from 'express';
import { handleExternalCredit } from '../controllers/ExternalCreditController.js';


const router = express.Router();

// POST /api/external/external-credit
router.post('/external-credit', handleExternalCredit);

export default router;
