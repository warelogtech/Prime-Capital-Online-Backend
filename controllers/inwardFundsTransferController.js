import mongoose from 'mongoose';
import InwardFundsTransfer from '../models/InwardFundsTransfer.js';
import wallet from '../models/wallet.js';
import GLTransaction from '../models/glTransactions.js';
import Counter from '../models/Counter.js'; // Ensure Counter is imported

// Create a new record
export const createInwardFundsTransfer = async (req, res) => {
  try {
    // Step 0: Generate inwdFundsXferId and xferRef
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'inwdFundsXferId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const inwdFundsXferId = counter.seq;
    const xferRef = `0000072${counter.seq.toString().padStart(10, '0')}`;

    // Step 1: Save the InwardFundsTransfer
    const transferData = {
      ...req.body,
      inwdFundsXferId,
      xferRef,
    };

    const newTransfer = new InwardFundsTransfer(transferData);
    const savedTransfer = await newTransfer.save();

    // Step 2: Find wallet using beneficiary account number
    const foundWallet = await wallet.findOne({ acct_no: transferData.beneficiary.acct_no });

    if (!foundWallet) {
      return res.status(404).json({ message: `Wallet not found for account: ${transferData.beneficiary.acct_no}` });
    }

    // Step 3: Credit wallet balance
    const amount = parseFloat(transferData.xferAmount.toString()); // Convert Decimal128 to float
    foundWallet.walletBalance += amount;
    foundWallet.netBalance += amount;

    // Step 4: Add transaction record
    foundWallet.transactions.push({
      type: 'credit',
      amount: amount,
      description: transferData.payDetails || 'Inward Funds Transfer',
      transferReference: xferRef,
    });

    // Step 5: Save updated wallet
    await foundWallet.save();

    // Step 6: Create a GLTransaction entry
    await GLTransaction.create({
      txnId: Date.now(),
      txnType: 'CR',
      amount,
      glAcctNo: '1000211030201',
      description: `Incoming transfer: ${xferRef}`,
      wallet_id: foundWallet._id,
      acct_no: foundWallet.acct_no,
      name: foundWallet.name,
      email: foundWallet.email,
      phoneNumber: foundWallet.phoneNumber,
      createdBy: 'system',
    });

    // Step 7: Return success response
    res.status(201).json({
      message: 'Transfer saved, wallet updated, and GL recorded.',
      data: savedTransfer,
    });

  } catch (error) {
    console.error('Error in inwardFundsTransfer:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


// Get all records
const getAllTransfers = async (req, res) => {
  try {
    const transfers = await InwardFundsTransfer.find();
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get a single record
const getTransferById = async (req, res) => {
  try {
    const transfer = await InwardFundsTransfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Not found' });
    res.json(transfer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a record
const updateTransfer = async (req, res) => {
  try {
    const updated = await InwardFundsTransfer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a record
const deleteTransfer = async (req, res) => {
  try {
    await InwardFundsTransfer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transfer deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Export all as default
export default {
  createInwardFundsTransfer,
  getAllTransfers,
  getTransferById,
  updateTransfer,
  deleteTransfer
};
