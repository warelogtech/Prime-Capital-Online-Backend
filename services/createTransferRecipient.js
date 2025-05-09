import dotenv from 'dotenv';
import https from 'https';
import { getBankCode } from './getBankCode.js';

dotenv.config();

export const createTransferRecipient = async ({ name, account_number, bank_name }) => {
  const bank_code = await getBankCode(bank_name);

  const params = JSON.stringify({
    type: "nuban",
    name,
    account_number,
    bank_code,
    currency: "NGN"
  });

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

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('📦 Paystack Transfer Recipient Response:', JSON.stringify(parsed, null, 2));

          const recipientCode = parsed?.data?.recipient_code;

          if (!recipientCode) {
            console.error('❌ No recipient_code returned:', parsed);
            return reject(new Error('Recipient code not found in response'));
          }

          resolve(recipientCode);
        } catch (err) {
          console.error('❌ Error parsing Paystack response:', err);
          reject(err);
        }
      });
    });

    req.on('error', error => {
      console.error('❌ HTTPS Request Error:', error);
      reject(error);
    });

    req.write(params);
    req.end();
  });
};
