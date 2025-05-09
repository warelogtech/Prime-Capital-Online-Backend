import mongoose from 'mongoose';
import GLTransaction from '../models/glTransactions.js';
import Wallet from '../models/wallet.js';
import Counter from '../models/Counter.js';

export const createGLTransaction = async (req, res) => {
  try {
    const {
      glAcctId,
      glAcctNo,
      txnType,
      amount,
      acct_no,
      description,
      createdBy,
    } = req.body;

    if (!/^\d{13}$/.test(glAcctNo)) {
      return res.status(400).json({
        message: 'GL Account Number must be a 13-digit number.',
      });
    }

    if (!['CR', 'DR'].includes(txnType)) {
      return res.status(400).json({
        message: 'Transaction type must be either "CR" or "DR".',
      });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: 'Amount must be a valid number greater than zero.',
      });
    }

    const wallet = await Wallet.findOne({ acct_no });
    if (!wallet) {
      return res.status(404).json({
        message: 'Associated wallet not found',
      });
    }

    const name = wallet.name || 'Unnamed Wallet Holder';

    const counter = await Counter.findByIdAndUpdate(
      { _id: 'txnId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const txnId = counter.seq;

    const transaction = new GLTransaction({
      txnId,
      glAcctId: glAcctId || `${glAcctNo}-${txnId}`,
      glAcctNo,
      name,
      txnType,
      amount: mongoose.Types.Decimal128.fromString(numericAmount.toString()),
      acct_no,
      wallet_id: wallet._id,
      description,
      createdBy: createdBy || 'system',
      email: wallet.email,
      phoneNumber: wallet.phoneNumber,
      customer_id: wallet.customer_id,
    });

    await transaction.save();

    if (txnType === 'CR') {
      wallet.walletBalance += numericAmount;
      wallet.transactions.push({
        type: 'credit',
        amount: numericAmount,
        description: description || 'GL Credit',
        date: new Date(),
      });
    } else if (txnType === 'DR') {
      wallet.walletBalance -= numericAmount;
      wallet.transactions.push({
        type: 'debit',
        amount: numericAmount,
        description: description || 'GL Debit',
        date: new Date(),
      });
    }

    wallet.netBalance = wallet.walletBalance - wallet.loanBalance;
    await wallet.save();

    return res.status(201).json({
      message: 'GL Transaction created successfully',
      transaction,
    });
  } catch (error) {
    console.error('Error creating GL transaction:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

// Default GET - fetch all transactions
export const getAllGLTransactions = async (req, res) => {
  try {
    const transactions = await GLTransaction.find().sort({ txnDate: -1 }); // Latest first
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};