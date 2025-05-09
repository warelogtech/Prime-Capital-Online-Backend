import https from 'https';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Initiates a Paystack transfer to a recipient.
 *
 * @param {string} recipient - The recipient code (from Paystack).
 * @param {number} amountKobo - Amount in Kobo (e.g. ₦5000 = 500000).
 * @param {string} reason - Reason for the transfer.
 * @returns {Promise<Object>} - Paystack response.
 */
export const initiateTransfer = (recipient, amountKobo, reason) => {
  return new Promise((resolve, reject) => {
    const params = JSON.stringify({
      source: "balance",
      amount: amountKobo,
      recipient,
      reason
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

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('📦 Paystack response:', parsed);

          if (res.statusCode === 200) {
            resolve(parsed);
          } else {
            reject(new Error(`Paystack API Error: ${parsed.message || 'Unknown error'}`));
          }
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
