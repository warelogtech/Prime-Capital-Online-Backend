// cronjobs/autoLoanRepayment.js

import cron from 'node-cron';
import Wallet from '../models/wallet.js';
import RepaymentTransaction from '../models/RepaymentTransaction.js';
import GLTransaction from '../models/glTransactions.js';
import Counter from '../models/Counter.js';
import User from '../models/User.js'; // ✅ Correct import

// Function to repay loan automatically
export const repayLoanAutomatically = async () => {
  try {
    // Fetch all wallets with outstanding loans
    const wallets = await Wallet.find({ loanBalance: { $gt: 0 } });

    for (const wallet of wallets) {
      // Handle missing customer_id
      if (!wallet.customer_id) {
        const last10 = wallet.acct_no.slice(-10); // Get last 10 digits

        // Find user whose phone number ends with those 10 digits
        const user = await User.findOne({
          phoneNumber: { $regex: `${last10}$` }
        });

        if (!user || !user.customer_id) {
          console.log(`❌ Missing customer_id for wallet: ${wallet.acct_no}`);
          continue; // Skip wallet
        }

        wallet.customer_id = user.customer_id;
        await wallet.save();
        console.log(`✅ Patched customer_id (${user.customer_id}) for acct_no: ${wallet.acct_no}`);
      }

      const { acct_no, loanBalance, walletBalance, name, email, phoneNumber } = wallet;

      // Calculate repayment amount
      const repaymentAmount = walletBalance > loanBalance ? loanBalance : walletBalance;

      if (repaymentAmount <= 0) {
        console.log(`No repayment necessary for account: ${acct_no}`);
        continue;
      }

      // Generate transaction ID
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'txnId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const txnId = counter.seq;

      // Update wallet
      wallet.loanBalance -= repaymentAmount;
      if (wallet.loanBalance < 0) wallet.loanBalance = 0;
      wallet.walletBalance -= repaymentAmount;
      wallet.netBalance = wallet.walletBalance - wallet.loanBalance;

      wallet.transactions.push({
        type: 'debit',
        amount: repaymentAmount,
        description: 'Automatic Loan Repayment',
        date: new Date(),
      });

      await wallet.save();

      // Save repayment transaction
      const repaymentTransaction = new RepaymentTransaction({
        txnId,
        amount: repaymentAmount,
        acct_no,
        wallet_id: wallet._id,
        description: 'Automatic Loan Repayment',
        createdBy: 'system',
      });

      await repaymentTransaction.save();

      // Create GL Transactions
      await GLTransaction.create([
        {
          txnId,
          txnType: 'DR',
          amount: repaymentAmount,
          glAcctNo: '2000312030401',
          glAcctId: `2000312030401-${txnId}-DR`,
          description: 'Loan Repayment - Reduce Loan Receivable',
          phoneNumber,
          wallet_id: wallet._id,
          acct_no,
          name,
          email,
          createdBy: 'system',
        },
        {
          txnId,
          txnType: 'CR',
          amount: repaymentAmount,
          glAcctNo: '2000211030201',
          glAcctId: `2000211030201-${txnId}-CR`,
          description: 'Loan Repayment - Bank Outflow',
          phoneNumber,
          wallet_id: wallet._id,
          acct_no,
          name,
          email,
          createdBy: 'system',
        }
      ]);

      console.log(`✅ Loan repayment successful for account: ${acct_no}`);
    }
  } catch (error) {
    console.error('❌ Error processing automatic loan repayments:', error);
  }
};

// Schedule the cron job to run daily at 1 AM
cron.schedule('0 1 * * *', () => {
  console.log('⏰ Starting automatic loan repayment process...');
  repayLoanAutomatically();
});
