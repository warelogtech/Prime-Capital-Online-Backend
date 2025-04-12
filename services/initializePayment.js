import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

export const initializePayment = (email, amount, reference, callback_url) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email,
      amount, // in kobo
      reference,
      callback_url
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};
