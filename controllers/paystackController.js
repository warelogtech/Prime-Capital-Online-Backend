import https from 'https';
import dotenv from 'dotenv';
import createTransferRecipientService from '../services/createTransferRecipient.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// ✅ Get bank list
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
      if (result.status) {
        return res.status(200).json({ banks: result.data });
      } else {
        return res.status(500).json({ message: result.message });
      }
    });
  });

  request.on('error', error => {
    console.error('❌ Bank List Error:', error);
    res.status(500).json({ message: 'Error fetching bank list', error: error.message });
  });

  request.end();
};

// ✅ Use service for creating transfer recipient

export const createTransferRecipient = async (req, res) => {
  try {
    console.log("📦 Request Body Received:", req.body);

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "Request body is missing" });
    }

    const {
      name,
      account_number,
      bank_code,
      currency = 'NGN'
    } = req.body;

    if (!name || !account_number || !bank_code) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const params = JSON.stringify({
      type: "nuban",
      name,
      account_number,
      bank_code,
      currency
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

    const paystackResponse = await new Promise((resolve, reject) => {
      const request = https.request(options, response => {
        let data = '';

        response.on('data', chunk => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.status) {
              resolve(parsed.data);
            } else {
              reject(new Error(parsed.message || 'Failed to create recipient'));
            }
          } catch (parseError) {
            reject(new Error('Invalid JSON from Paystack'));
          }
        });
      });

      request.on('error', reject);
      request.write(params);
      request.end();
    });

    return res.status(200).json({
      message: "Recipient created successfully",
      data: paystackResponse
    });

  } catch (error) {
    console.error("❌ Error creating recipient:", error.message);
    return res.status(500).json({
      message: "Error creating transfer recipient",
      error: error.message
    });
  }
};

// ✅ Bulk transfer
export const initiateBulkTransfer = (req, res) => {
  const transfers = req.body.transfers;

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

  const request = https.request(options, response => {
    let data = '';

    response.on('data', chunk => {
      data += chunk;
    });

    response.on('end', () => {
      const result = JSON.parse(data);
      if (result.status) {
        return res.status(200).json(result.data);
      } else {
        return res.status(500).json({ message: result.message });
      }
    });
  });

  request.on('error', error => {
    console.error('❌ Bulk Transfer Error:', error);
    res.status(500).json({ message: 'Error initiating bulk transfer', error: error.message });
  });

  request.write(params);
  request.end();
};
