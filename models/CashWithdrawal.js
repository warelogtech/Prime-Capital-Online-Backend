import mongoose from 'mongoose';

const cashWithdrawalSchema = new mongoose.Schema({
  wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
  acct_no: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String, default: 'Cash Withdrawal' },
  bank_code: { type: String, required: true },
  account_number: { type: String, required: true },
  recipient_code: { type: String }, // Paystack recipient code
  transferRef: { type: String }, // Reference for the transfer
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('CashWithdrawal', cashWithdrawalSchema);
