// initiateTransfer.js
import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

export const initiateTransfer = (recipient, amountKobo, reason) => {
  return new Promise((resolve, reject) => {
    const params = JSON.stringify({
      source: "balance",
      amount: amountKobo, // amount in kobo
      recipient,        // transfer recipient code from Paystack
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

    const req = https.request(options, res => {
      let data = '';

      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.write(params);
    req.end();
  });
};
