import { v4 as uuidv4 } from 'uuid'; 
import mongoose from 'mongoose';
import Wallet from '../models/wallet.js';
import GLTransaction from '../models/glTransactions.js';
import { normalizePhoneNumber } from '../utils/normalizePhone.js'; // Import the normalization function
import {initiateTransfer} from '../services/initiateTransfer.js';
import RepaymentTransaction from '../models/RepaymentTransaction.js';
import Counter from '../models/Counter.js';
import DisbursedLoan from '../models/DisbursedLoan.js';
import Withdrawal from '../models/CashWithdrawal.js';
import ExternalCredit from '../models/ExternalCredit.js';
import { transferCodeStore } from '../store.js';

import https from 'https';
import dotenv from 'dotenv';
dotenv.config();


// Function to credit the wallet
export const creditWallet = async (req, res) => {
  try {
    const { acct_no, amount, description } = req.body;
    console.log('Received account number:', acct_no);

    if (!acct_no) {
      return res.status(400).json({ message: "Account number is invalid or missing" });
    }

    console.log('Attempting to find wallet for account number:', acct_no);
    const wallet = await Wallet.findOne({ acct_no });

    if (!wallet) {
      console.error(`Wallet not found for account number: ${acct_no}`);
      return res.status(404).json({ message: "Wallet not found" });
    }

    // Retrieve values from wallet
    const { name, email } = wallet;

    // Update wallet balance
    wallet.walletBalance += amount;
    wallet.netBalance = wallet.walletBalance - wallet.loanBalance;

    wallet.transactions.push({
      type: 'credit',
      amount,
      description,
      date: new Date(),
    });

    await wallet.save();

    // Create a GLTransaction
    await GLTransaction.create({
      txnId: Date.now(),
      txnType: 'DR', // Debit because we are crediting the wallet
      amount,
      glAcctNo: '1000211030201',
      description: description || 'Credit Wallet',
      phoneNumber: wallet.phoneNumber,
      wallet_id: wallet._id,
      acct_no: wallet.acct_no,
      name,
      email,  
      createdBy: 'system',
    });

    return res.status(200).json({ message: 'Wallet credited successfully', wallet });

  } catch (error) {
    console.error('Error crediting wallet:', error);
    return res.status(500).json({ message: `Error crediting wallet: ${error.message}` });
  }
};


export const verifyPaymentAndCreditWallet = async (req, res) => {
  const { reference } = req.params;

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: `/transaction/verify/${reference}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
    }
  };

  https.get(options, async (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
      data += chunk;
    });

    resp.on('end', async () => {
      try {
        const parsed = JSON.parse(data);

        // ✅ Check if parsed.data exists and has status
        if (!parsed || !parsed.data || parsed.data.status !== 'success') {
          return res.status(400).json({
            message: "Payment not successful or invalid Paystack response",
            paystack_response: parsed
          });
        }

        const acct_no = parsed.data.metadata?.acct_no;
        const amount = parsed.data.amount / 100;
        const description = parsed.data?.gateway_response || 'Fund Wallet';

        if (!acct_no) {
          return res.status(400).json({ message: "Missing account number in metadata" });
        }

        const wallet = await Wallet.findOne({ acct_no });
        if (!wallet) {
          return res.status(404).json({ message: "Wallet not found" });
        }

        const { name, email } = wallet;

        wallet.walletBalance += amount;
        wallet.netBalance = wallet.walletBalance - wallet.loanBalance;

        wallet.transactions.push({
          type: 'credit',
          amount,
          description,
          date: new Date(),
        });

        await wallet.save();

        await GLTransaction.create({
          txnId: Date.now(),
          txnType: 'DR',
          amount,
          glAcctNo: '1000211030201',
          description,
          phoneNumber: wallet.phoneNumber,
          wallet_id: wallet._id,
          acct_no: wallet.acct_no,
          name,
          email,
          createdBy: 'paystack-webhook'
        });

        await ExternalCredit.create({
          reference,
          acct_no,
          wallet_id: wallet._id,
          name,
          email,
          amount,
          description,
          status: parsed.data.status,
          gateway: 'Paystack'
        });

        return res.status(200).json({ message: 'Wallet funded successfully' });

      } catch (err) {
        console.error("JSON parsing or internal error:", err);
        res.status(500).json({ message: 'Verification failed', error: err.message });
      }
    });

  }).on('error', error => {
    console.error("Paystack connection error:", error);
    res.status(500).json({ message: 'Verification error', error });
  });
};



// Simulate the generation of a transfer code during a cash withdrawal
// Simulate the generation of a transfer code during a cash withdrawal
const simulateWithdrawal = (acct_no, amount) => {
  const transfer_code = `TRF-${Math.floor(Math.random() * 1000000)}`;
  const reference = `REF-${Math.floor(Math.random() * 1000000)}`;
  const createdAt = new Date().toISOString();

  transferCodeStore[acct_no] = {
    transfer_code,
    reference,
    createdAt,
    amount,
  };

  console.log(`✅ Simulated transfer code for ${acct_no}:`, transferCodeStore[acct_no]);
  return { transfer_code, reference, createdAt };
};

// Cash withdrawal processing
export const cashWithdrawal = async (req, res) => {
  try {
    const withdrawals = req.body;

    if (!Array.isArray(withdrawals) || withdrawals.length === 0) {
      return res.status(400).json({ message: "No withdrawal data provided" });
    }

    const results = [];

    for (const data of withdrawals) {
      const { name, acct_no, amount, description, bank_code, account_number } = data;

      if (!acct_no || !account_number || !bank_code) {
        results.push({ acct_no, status: "failed", message: "Account number or bank code is missing" });
        continue;
      }

      const wallet = await Wallet.findOne({ acct_no });
      if (!wallet) {
        results.push({ acct_no, status: "failed", message: "Wallet not found" });
        continue;
      }

      if (!wallet.name && name) {
        wallet.name = name;
      }

      if (!amount || amount <= 0) {
        results.push({ acct_no, status: "failed", message: "Withdrawal amount should be greater than zero" });
        continue;
      }

      if (wallet.walletBalance < amount) {
        results.push({ acct_no, status: "failed", message: "Insufficient funds" });
        continue;
      }

      const recipientPayload = JSON.stringify({
        type: "nuban",
        name: wallet.name,
        account_number,
        bank_code,
        currency: "NGN"
      });

      let recipient_code;
      try {
        recipient_code = await new Promise((resolve, reject) => {
          const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: '/transferrecipient',
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json'
            }
          };

          const reqRecipient = https.request(options, resRecipient => {
            let data = '';
            resRecipient.on('data', chunk => data += chunk);
            resRecipient.on('end', () => {
              const response = JSON.parse(data);
              if (response.status && response.data?.recipient_code) {
                resolve(response.data.recipient_code);
              } else {
                reject(new Error(response.message || "Recipient creation failed"));
              }
            });
          });

          reqRecipient.on('error', reject);
          reqRecipient.write(recipientPayload);
          reqRecipient.end();
        });
      } catch (err) {
        results.push({ acct_no, status: "failed", message: err.message });
        continue;
      }

      // Deduct and update wallet
      wallet.walletBalance -= amount;
      wallet.netBalance = wallet.walletBalance - wallet.loanBalance;
      wallet.transactions.push({
        type: 'debit',
        amount,
        description: description || 'Cash Withdrawal',
        date: new Date(),
      });
      await wallet.save();

      const email = wallet.email;
      const glAcctId = `${wallet.acct_no}-${Date.now()}`;

      await GLTransaction.create([
        {
          txnId: Date.now() + Math.floor(Math.random() * 1000),
          txnType: 'DR',
          amount,
          glAcctNo: '2000211030201',
          glAcctId,
          description: description || 'Cash Withdrawal',
          phoneNumber: wallet.phoneNumber,
          wallet_id: wallet._id,
          acct_no: wallet.acct_no,
          name: wallet.name,
          email,
          createdBy: 'system',
        },
        {
          txnId: Date.now() + Math.floor(Math.random() * 1000),
          txnType: 'CR',
          amount,
          glAcctNo: '1000211030201',
          glAcctId: glAcctId + '-CR',
          description: description || 'Cash Withdrawal to Bank',
          phoneNumber: wallet.phoneNumber,
          wallet_id: wallet._id,
          acct_no: wallet.acct_no,
          name: wallet.name,
          email,
          createdBy: 'system',
        }
      ]);

      const { transfer_code, reference, createdAt } = simulateWithdrawal(acct_no, amount);

      await Withdrawal.create({
        acct_no,
        wallet_id: wallet._id,
        amount,
        status: 'processed',
        reference,
        description,
        bank_code,
        account_number,
        recipient_code,
        email,
        phone: wallet.phoneNumber,
        created_at: new Date()
      });

      results.push({
        acct_no,
        status: "processed",
        transferRef: reference,
        transferResult: {
          status: true,
          message: "Transfer requires OTP to continue",
          data: {
            transfersessionid: [],
            transfertrials: [],
            domain: "test",
            amount,
            currency: "NGN",
            reference,
            source: "balance",
            reason: "Cash out to bank",
            status: "otp",
            transfer_code,
            titan_code: null,
            transferred_at: null,
            id: Math.floor(Math.random() * 1000000),
            integration: Math.floor(Math.random() * 1000000),
            request: Math.floor(Math.random() * 1000000),
            recipient: Math.floor(Math.random() * 1000000),
            createdAt,
            updatedAt: new Date().toISOString()
          }
        }
      });
    }

    return res.status(200).json({
      message: "Withdrawals processed",
      data: results
    });

  } catch (error) {
    console.error("❌ Withdrawal error:", error);
    return res.status(500).json({ message: "Withdrawal failed", error: error.message });
  }
};

// GET /api/wallet/transfer-code/:acct_no
export const getTransferCode = (req, res) => {
  const { acct_no } = req.params;

  const transferData = transferCodeStore[acct_no];
  if (!acct_no || !transferData) {
    console.log(`❌ Transfer code not found for ${acct_no}`);
    return res.status(404).json({ message: "Transfer code not found for this account." });
  }

  const { transfer_code, reference, createdAt } = transferData;

  return res.status(200).json({
    message: "Transfer code retrieved successfully",
    data: { acct_no, transfer_code, reference, createdAt }
  });
};


// Utility function (reusable)
export const disburseWallet = async ({ acct_no, amount, description, interestRate = 0.15, repaymentPeriod = 14 }) => {
  try {
    const wallet = await Wallet.findOne({ acct_no });
    if (!wallet) {
      return { status: 404, message: "Wallet not found" };
    }

    const { email } = wallet;

    const interest = amount * interestRate;
    const totalDisbursement = amount + interest;
    const dailyRepayment = totalDisbursement / repaymentPeriod;

    // Update wallet loan balance
    wallet.loanBalance += totalDisbursement;
    wallet.netBalance = wallet.walletBalance - wallet.loanBalance;

    // Record transaction in wallet
    wallet.transactions.push({
      type: 'credit',
      amount: totalDisbursement,
      description: description || `Loan Disbursement (Principal: ${amount}, Interest: ${interest.toFixed(2)})`,
      date: new Date(),
    });

    await wallet.save();

    // Insert a new DisbursedLoan record
    await DisbursedLoan.create({
      wallet_id: wallet._id,
      acct_no,
      principal: amount,
      interest,
      totalDisbursed: totalDisbursement,
      repaymentPeriod,
      dailyRepayment,
      description: description || 'Loan Disbursement'
    });

    // Record GL Transaction
    await GLTransaction.create({
      txnId: Date.now(),
      txnType: 'CR',
      amount: mongoose.Types.Decimal128.fromString(totalDisbursement.toString()),
      glAcctNo: '1000211030201',
      glAcctId: '1000211030201-' + Date.now(), // ensure uniqueness
      description: description || `Loan Disbursement (Principal: ${amount}, Interest: ${interest.toFixed(2)})`,
      phoneNumber: wallet.phoneNumber,
      wallet_id: wallet._id,
      acct_no,
      email,
      createdBy: 'system',
    });

    return {
      status: 200,
      walletBalance: wallet.walletBalance,
      loanBalance: wallet.loanBalance,
      netBalance: wallet.netBalance,
      message: "Loan disbursed successfully with interest",
      interest,
      totalDisbursement,
      repaymentPeriod,
      dailyRepayment
    };
  } catch (error) {
    console.error('Error in disburseWallet:', error);
    return { status: 500, message: "Disbursement error", error: error.message };
  }
};

// Function for Loan repayment
export const repayLoan = async (req, res) => {
  try {
    const { acct_no, amount, description } = req.body;
    console.log('Received account number for loan repayment:', acct_no);

    if (!acct_no) {
      return res.status(400).json({ message: "Account number is invalid or missing" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Amount should be greater than zero" });
    }

    const wallet = await Wallet.findOne({ acct_no });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    const { name, email } = wallet;

    if (wallet.loanBalance <= 0) {
      return res.status(400).json({ message: "No outstanding loan balance to repay" });
    }

    if (amount > wallet.loanBalance) {
      return res.status(400).json({ message: "Repayment amount exceeds loan balance" });
    }

    //Generate unique txnId from Counter
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'txnId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const txnId = counter.seq;

    //  Update wallet balances
    wallet.loanBalance -= amount;
    if (wallet.loanBalance < 0) wallet.loanBalance = 0;
    wallet.netBalance = wallet.walletBalance - wallet.loanBalance;

    wallet.transactions.push({
      type: 'debit',
      amount,
      description: description || 'Loan Repayment',
      date: new Date(),
    });

    await wallet.save();

    // Save Repayment Transaction
    const repaymentTransaction = new RepaymentTransaction({
      txnId,
      amount,
      acct_no: wallet.acct_no,
      wallet_id: wallet._id,
      description: description || 'Loan Repayment',
      createdBy: 'system',
    });

    await repaymentTransaction.save();

    // Create GL Transactions
    await GLTransaction.create([
      {
        txnId,
        txnType: 'DR',
        amount,
        glAcctNo: '2000312030401',
        glAcctId: `2000312030401-${txnId}-DR`,
        description: description || 'Loan Repayment - Reduce Loan Receivable',
        phoneNumber: wallet.phoneNumber,
        wallet_id: new mongoose.Types.ObjectId(wallet._id),
        acct_no: wallet.acct_no,
        name,
        email,
        createdBy: 'system',
      },
      {
        txnId,
        txnType: 'CR',
        amount,
        glAcctNo: '2000211030201',
        glAcctId: `2000211030201-${txnId}-CR`,
        description: description || 'Loan Repayment - Bank Outflow',
        phoneNumber: wallet.phoneNumber,
        wallet_id: new mongoose.Types.ObjectId(wallet._id),
        acct_no: wallet.acct_no,
        name,
        email,
        createdBy: 'system',
      }
    ]);

    res.status(200).json({
      message: "Loan repayment successful",
      walletBalance: wallet.walletBalance,
      loanBalance: wallet.loanBalance,
      netBalance: wallet.netBalance,
    });

  } catch (error) {
    console.error('Error processing loan repayment:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// Get transaction history by account number
export const getTransactionHistory = async (req, res) => {
  try {
    const { acct_no } = req.params;

    if (!acct_no) {
      return res.status(400).json({ message: 'Account number is required' });
    }

    const transactions = await GLTransaction.find({ acct_no }).sort({ createdAt: -1 });

    if (!transactions.length) {
      return res.status(404).json({ message: 'No transactions found for this account number' });
    }

    res.status(200).json({
      message: 'Transaction history retrieved successfully',
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error('Error retrieving transaction history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Function to get all wallet details
// Get all wallet transactions from all wallets
export const getAllWalletTransactions = async (req, res) => {
  try {
    // Retrieve all wallets
    const wallets = await Wallet.find();
    
    if (!wallets || wallets.length === 0) {
      return res.status(200).json({
        message: "No wallets found",
        count: 0,
        transactions: []
      });
    }
    
    // Flatten transactions from all wallets into one array
    let allTransactions = [];
    wallets.forEach(wallet => {
      if (wallet.transactions && wallet.transactions.length > 0) {
        const txns = wallet.transactions.map(txn => ({
          acct_no: wallet.acct_no,
          walletBalance: wallet.walletBalance,
          loanBalance: wallet.loanBalance,
          netBalance: wallet.netBalance,
          ...txn.toObject()
        }));
        allTransactions = allTransactions.concat(txns);
      }
    });
    
    // If no transactions exist across all wallets, return an empty array with a success message
    return res.status(200).json({
      message: "All wallet transactions retrieved successfully",
      count: allTransactions.length,
      transactions: allTransactions
    });
  } catch (error) {
    console.error('Error retrieving wallet transactions:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Function to get the wallet details for a user
export const getWalletDetails = async (req, res) => {
  try {
    const { acct_no } = req.params;
    const wallet = await Wallet.findOne({ acct_no });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    res.status(200).json({
      message: "Wallet details fetched successfully",
      wallet: {
        acct_no: wallet.acct_no,
        walletBalance: wallet.walletBalance,
        loanBalance: wallet.loanBalance,
        transactions: wallet.transactions,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Function to reset the wallet balance
export const resetWallet = async (req, res) => {
  try {
    const { acct_no } = req.body;
    const wallet = await Wallet.findOne({ acct_no });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    wallet.walletBalance = 0;
    wallet.loanBalance = 0;
    wallet.transactions = [];

    await wallet.save();

    res.status(200).json({
      message: "Wallet reset successfully",
      walletBalance: wallet.walletBalance,
      loanBalance: wallet.loanBalance,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/wallet/account-name/:acct_no
export const getAccountName = async (req, res) => {
  try {
    const { acct_no } = req.params;

    // Search for the wallet based on the account number
    const wallet = await Wallet.findOne({ acct_no });

    if (!wallet) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Send the name as part of the response
    return res.status(200).json({
      message: "Account name retrieved successfully",
      data: { acct_no, name: wallet.name }
    });

  } catch (error) {
    console.error("❌ Error fetching account name:", error);
    return res.status(500).json({ message: "Error fetching account name", error: error.message });
  }
};
