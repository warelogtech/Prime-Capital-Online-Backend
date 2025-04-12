import mongoose from 'mongoose';

const repaymentTransactionSchema = new mongoose.Schema(
  {
    txnId: {
      type: Number,
      required: true,
    },
    
    
    txnDate: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: mongoose.Types.Decimal128,
      required: true,
    },
    acct_no: {
      type: String,
      required: true,
    },
    wallet_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    description: {
      type: String,
      maxlength: 255,
    },
    createdBy: {
      type: String,
      default: 'system',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('RepaymentTransaction', repaymentTransactionSchema);
