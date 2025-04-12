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
      acct_no, // used to find wallet
      description,
      createdBy,
    } = req.body;

    //  Validate GL Account Number (13-digit)
    if (!/^\d{13}$/.test(glAcctNo)) {
      return res.status(400).json({
        message: 'GL Account Number must be a 13-digit number.',
      });
    }

    //  Validate transaction type
    if (!['CR', 'DR'].includes(txnType)) {
      return res.status(400).json({
        message: 'Transaction type must be either "CR" or "DR".',
      });
    }

    // Validate amount
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: 'Amount must be a valid number greater than zero.',
      });
    }

    // Find wallet using acct_no
    const wallet = await Wallet.findOne({ acct_no });

    // If wallet not found, return error
    if (!wallet) {
      return res.status(404).json({
        message: 'Associated wallet not found',
      });
    }

    // Retrieve the name of the customer from the wallet (fallback if missing)
    const name = wallet.name || 'Unnamed Wallet Holder';

    //  Generate txnId using counter
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'txnId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const txnId = counter.seq;

    //  Create and save GL Transaction
    const transaction = new GLTransaction({
      txnId,
      glAcctId,
      glAcctNo,
      name,  // Now safely added
      txnType,
      amount: mongoose.Types.Decimal128.fromString(numericAmount.toString()),
      acct_no,
      wallet_id: wallet._id,
      description,
      createdBy: createdBy || 'system',
    });

    await transaction.save();

    // Update wallet balances and transaction history
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

    //  Update netBalance
    wallet.netBalance = wallet.walletBalance - wallet.loanBalance;
    await wallet.save();

    //  Final response
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