import mongoose from 'mongoose';
import Counter from './Counter.js';  // Import the Counter model

const glTransactionSchema = new mongoose.Schema(
  {
    txnId: {
      type: Number,  // Keep txnId as a Number for auto-increment functionality
      required: true,
    },
    txnDate: {
      type: Date,
      default: Date.now,
    },
    glAcctId: {
      type: String,  // Change this to String to allow the unique suffix
      unique: false,  
    },
    glAcctNo: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^\d{13}$/.test(v);
        },
        message: props => `${props.value} is not a valid 13-digit GL Account Number`,
      },
    },
    txnType: {
      type: String,
      enum: ['DR', 'CR'],
      required: true,
    },
    amount: {
      type: mongoose.Types.Decimal128,
      required: true,
    },
    name: {
      type: String,
      required: false,
    },
    acct_no: { 
      type: String,
      required: true,
    },
    wallet_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: false,
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

// Pre-save hook to generate txnId if not provided
glTransactionSchema.pre('save', async function (next) {
  if (!this.txnId) {
    // Get the next available txnId from the Counter collection
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'txnId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    // Ensure txnId is a 13-digit number
    this.txnId = counter.seq;  // txnId will be auto-incremented
  }

  // Ensure glAcctId is a string and append txnId to make it unique
  if (this.glAcctId) {
    this.glAcctId = this.glAcctId.toString();  // Ensure glAcctId is a string
  }

  next();
});

// Format output dates
glTransactionSchema.methods.toJSON = function () {
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
    return new Date(date).toLocaleString('en-GB', options).replace(',', '').replace(' ', 'T');
  };

  obj.createdAt = formatDate(obj.createdAt);
  obj.updatedAt = formatDate(obj.updatedAt);
  obj.txnDate = formatDate(obj.txnDate);

  return obj;
};

export default mongoose.model('GLTransaction', glTransactionSchema);
