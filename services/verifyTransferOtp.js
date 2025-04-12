import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

export const verifyTransferOtp = (transferCode, otp) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      transfer_code: transferCode,
      otp: otp
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transfer/finalize_transfer',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, res => {
      let response = '';

      res.on('data', chunk => { response += chunk; });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(response);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
};
