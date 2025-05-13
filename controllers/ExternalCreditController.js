// controllers/ExternalCreditController.js
import Wallet from '../models/wallet.js';
import initiateTransfer from '../services/initiateTransfer.js';
import createTransferRecipient from '../services/createTransferRecipient.js'; // Ensure path is correct

export const handleExternalCredit = async (req, res) => {
  const {
    acct_no,
    name,
    email,
    amount,
    bank_code,
    description
  } = req.body;

  const userId = req.user?._id;

  try {
    // 1. Find wallet
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // 2. Ensure sufficient balance
    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    const amountKobo = amount * 100;
    const reference = `ref_${Date.now()}`;

    // 3. Create transfer recipient
    const recipient = await createTransferRecipient({
      name,
      account_number: acct_no,
      bank_code,
      currency: 'NGN'
    });

    const recipient_code = recipient.recipient_code;

    // 4. Initiate transfer via Paystack
    const result = await initiateTransfer(
      recipient_code,
      amountKobo,
      description,
      reference,
      {
        wallet_id: wallet._id,
        acct_no,
        name,
        email
      }
    );

    console.log('Transfer result:', JSON.stringify(result, null, 2));

    // 5. Determine actual transfer status path
    const transferStatus = result?.data?.data?.status || result?.data?.status || result?.status;

    // 6. Debit wallet ONLY if transfer was accepted
    if (['otp', 'success'].includes(transferStatus)) {
      console.log(`Debiting wallet. Old balance: ${wallet.balance}`);
      wallet.balance -= amount;
      await wallet.save();
      console.log(`New balance: ${wallet.balance}`);
    } else {
      console.warn('Transfer status not acceptable for debit:', transferStatus);
    }

    // 7. Send success response
    return res.status(200).json({ message: 'Transfer initiated', data: result });

  } catch (err) {
    console.error('Transfer error:', err);
    return res.status(500).json({ message: 'Transfer failed', error: err.message });
  }
};
