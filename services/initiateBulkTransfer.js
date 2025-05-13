// services/initiateBulkTransfer.js
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

export const initiateBulkTransfer = (transfers) => {
  return new Promise((resolve, reject) => {
    const params = JSON.stringify({
      currency: 'NGN',
      source: 'balance',
      transfers
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transfer/bulk',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        const result = JSON.parse(data);
        if (result.status) {
          resolve(result.data); // return only the relevant payload
        } else {
          reject(new Error(result.message));
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.write(params);
    request.end();
  });
};
