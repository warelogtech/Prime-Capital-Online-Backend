import express from 'express';
import {
  creditWallet,
  disburseWallet,
  getWalletDetails,
  resetWallet,
  repayLoan,
  cashWithdrawal,
  getTransactionHistory,
  getAllWalletTransactions,
  verifyPaymentAndCreditWallet,
  getTransferCode
} from '../controllers/walletController.js';
import { initializePayment } from '../services/initializePayment.js';

const router = express.Router();

router.post('/fund-wallet', async (req, res) => {
  const { email, amount } = req.body;

  if (!email || !amount) {
    return res.status(400).json({ message: "Email and amount are required" });
  }

  const reference = `WL_${Date.now()}`;
  const callback_url = `https://www.apiwarelogtech.app/api/wallet/verify-payment/${reference}`;

  try {
    // Initialize payment with the payment service
    const response = await initializePayment(email, amount * 100, reference, callback_url); // convert amount to kobo
    const paymentUrl = response.data.authorization_url; // Paystack returns the URL for payment

    // Now record the external credit details in the ExternalCredit model
    const newCredit = new ExternalCredit({
      reference,
      acct_no: email,  // Using email as the account number for simplicity, replace if needed
      wallet_id: 'some-wallet-id', // Replace with actual Wallet ID
      name: 'User Name', // Replace with actual user name
      email,
      amount,
      description: 'Wallet funding via Paystack',
      status: 'pending', // Status is initially pending, will be updated after payment verification
      gateway: 'Paystack',
    });

    // Save the external credit to DB
    await newCredit.save();

    return res.status(200).json({
      message: "Payment initiated and external credit recorded",
      paymentUrl, // URL to redirect for payment
      data: response.data,
    });
  } catch (error) {
    console.error('Error during payment initialization:', error);
    return res.status(500).json({ message: "Payment initialization failed", error: error.message });
  }
});

// Verify and credit wallet after webhook or callback
router.post('/verify-payment/:reference', verifyPaymentAndCreditWallet);


// Route to credit wallet balance
router.post('/credit-wallet',  creditWallet);

// Route to Withdrawal
router.post('/cash-wallet',  cashWithdrawal);

// Route to debit wallet balance (e.g., loan repayment)
router.post('/disburse', async (req, res) => {
  const result = await disburseWallet(req.body);
  res.status(result.status).json(result);
});

// Route to get wallet details for a user
router.get('/transaction/:acct_no', getTransactionHistory);

// Route to get wallet details for a user
router.get('/wallet/:acct_no', getWalletDetails);

// Route to get wallet  for all user
router.get('/credit-wallet', getAllWalletTransactions);

router.post('/loan-repay', repayLoan);

router.get("/wallet/transfer-code/:acct_no", getTransferCode);

// Route to reset the wallet balance (for testing or other purposes)
router.post('/reset-wallet', resetWallet);

export default router;
