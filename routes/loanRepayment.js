import express from 'express';
import { repayLoanAutomatically } from '../cronjobs/autoLoanRepayment.js'; // Import the cron job function
const router = express.Router();

// Endpoint to trigger loan repayment manually
router.post('/trigger-loan-repayment', async (req, res) => {
  try {
    console.log('Manual loan repayment process started...');
    await repayLoanAutomatically();  // Call the function to process the loan repayments
    res.status(200).json({ message: 'Loan repayment process triggered successfully.' });
  } catch (error) {
    console.error('Error triggering loan repayment:', error);
    res.status(500).json({ error: 'Error triggering loan repayment' });
  }
});

export default router;
