// controllers/paystackController.js
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

export const getMobileMoneyBanks = (req, res) => {
  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: '/bank?country=nigeria',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
    }
  };

  const request = https.request(options, response => {
    let data = '';

    response.on('data', chunk => {
      data += chunk;
    });

    response.on('end', () => {
      const result = JSON.parse(data);
      if (result.status === true) {
        return res.status(200).json({ banks: result.data });
      } else {
        return res.status(500).json({ message: result.message });
      }
    });
  });

  request.on('error', error => {
    console.error('❌ Paystack Bank List Error:', error);
    res.status(500).json({ message: 'Error fetching mobile money banks', error: error.message });
  });

  request.end();
};
