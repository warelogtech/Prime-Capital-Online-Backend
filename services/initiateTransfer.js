import https from 'https';
import dotenv from 'dotenv';
import ExternalCredit from '../models/ExternalCredit.js'; // make sure .js is included if using ES Modules

dotenv.config();

/**
 * Initiates a Paystack transfer and saves to ExternalCredit.
 *
 * @param {string} recipient - The Paystack recipient code.
 * @param {number} amountKobo - Amount in Kobo (e.g. ₦5000 = 500000).
 * @param {string} reason - Reason for the transfer.
 * @param {string} reference - Unique reference for the transaction.
 * @param {object} extraData - Optional: Additional info for saving to DB (wallet_id, acct_no, name, email).
 * @returns {Promise<Object>} - Paystack API response.
 */
export const initiateTransfer = (recipient, amountKobo, reason, reference, extraData = {}) => {
  return new Promise((resolve, reject) => {
    const params = JSON.stringify({
      source: "balance",
      amount: amountKobo,
      recipient,
      reason,
      reference
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transfer',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    console.log('💳 Transfer Params:', params);
    console.log('🔐 Paystack Key:', process.env.PAYSTACK_SECRET_KEY ? '[OK]' : '[MISSING]');

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', async () => {
        try {
          const parsed = JSON.parse(data);
          console.log('📦 Paystack response:', parsed);

          if (!parsed.status || res.statusCode !== 200) {
            return reject(new Error(`Transfer failed: ${parsed.message || 'Unknown error'}`));
          }

          // ✅ Save to ExternalCredit DB
          const credit = new ExternalCredit({
            reference,
            acct_no: extraData.acct_no,
            wallet_id: extraData.wallet_id,
            name: extraData.name,
            email: extraData.email,
            amount: amountKobo / 100, // convert Kobo to Naira
            description: reason,
            status: 'success',
            gateway: 'Paystack'
          });

          await credit.save();

          resolve(parsed);
        } catch (err) {
          reject(new Error('Invalid JSON response from Paystack'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❗ HTTPS request failed:', error);
      reject(error);
    });

    req.write(params);
    req.end();
  });
};

export default initiateTransfer;
