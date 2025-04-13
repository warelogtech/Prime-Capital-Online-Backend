// models/ExternalCredit.js
import mongoose from 'mongoose';

const externalCreditSchema = new mongoose.Schema({
  reference: { type: String, required: true },
  acct_no: { type: String, required: true },
  wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
  name: String,
  email: String,
  amount: Number,
  description: String,
  status: { type: String, default: 'success' }, // or 'pending', 'failed'
  date: { type: Date, default: Date.now },
  gateway: { type: String, default: 'Paystack' }
});

export default mongoose.model('ExternalCredit', externalCreditSchema);
