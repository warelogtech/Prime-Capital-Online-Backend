import https from 'https';

export const createTransferRecipient = ({ name, account_number, bank_code, currency }) => {
  return new Promise((resolve, reject) => {
    const params = JSON.stringify({
      type: 'nuban',
      name,
      account_number,
      bank_code,
      currency: currency || 'NGN'
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

    const request = https.request(options, response => {
      let data = '';

      response.on('data', chunk => {
        data += chunk;
      });

      response.on('end', () => {
        const result = JSON.parse(data);
        if (result.status) {
          resolve(result.data);
        } else {
          reject(new Error(result.message));
        }
      });
    });

    request.on('error', error => {
      reject(error);
    });

    request.write(params);
    request.end();
  });
};

export default createTransferRecipient;
