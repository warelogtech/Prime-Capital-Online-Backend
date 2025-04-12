import mongoose from 'mongoose';
import Counter from './Counter.js';

// Define transaction schema
const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  transferReference: {
    type: String,
    required: false,  // Optional transfer reference field
  },
  recipient_code: {
    type: String,
    required: false, // Optional recipient code field
  }
}, { _id: false });

// Add custom toJSON method to format dates
transactionSchema.methods.toJSON = function () {
  const obj = this.toObject();

  const formatDate = (date) => {
    if (!date) return null;
    const options = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    };
    return new Date(date).toLocaleString('en-GB', options).replace(',', '').replace(' ', 'T').toLowerCase();
  };

  obj.date = formatDate(obj.date); // Format the transaction date

  return obj;
};

// Define wallet schema
const walletSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  acct_no: {
    type: String,
    required: true, 
    unique: true, 
    minlength: 10, 
    maxlength: 10, 
  },
  wallet_id: {
    type: Number,
    unique: true, 
  },
  walletBalance: {
    type: Number,
    default: 0.0,
  },
  loanBalance: {
    type: Number,
    default: 0.0,
  },
  netBalance: {
    type: Number,
    default: 0.0,
  },
  transactions: [transactionSchema],  // Nested transaction schema
  customer_id: { 
    type: Number,  // Ensuring customer_id is a number
    required: true,
    unique: true,
    minlength: 7,
    maxlength: 7,  // Ensuring it is a 7-digit number
  },
}, { timestamps: true });

// Pre-save hook to auto-generate wallet_id
walletSchema.pre('save', async function (next) {
  if (!this.wallet_id) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'wallet_id' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.wallet_id = counter.seq;
  }
  next();
});

// Add a custom toJSON method to format the wallet's createdAt and updatedAt
walletSchema.methods.toJSON = function () {
  const obj = this.toObject();

  const formatDate = (date) => {
    if (!date) return null;
    const options = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    };
    return new Date(date).toLocaleString('en-GB', options).replace(',', '').replace(' ', 'T').toLowerCase();
  };

  obj.createdAt = formatDate(obj.createdAt);
  obj.updatedAt = formatDate(obj.updatedAt);

  return obj;
};

export default mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);
