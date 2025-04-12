import mongoose from 'mongoose';

const disbursedLoanSchema = new mongoose.Schema({
  wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
  acct_no: { type: String, required: true },
  principal: { type: Number, required: true },
  interest: { type: Number, required: true },
  totalDisbursed: { type: Number, required: true },
  repaymentPeriod: { type: Number, required: true },
  dailyRepayment: { type: Number, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('DisbursedLoan', disbursedLoanSchema);
