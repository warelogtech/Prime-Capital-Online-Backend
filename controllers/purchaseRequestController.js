import moment from 'moment';
import walletController, { disburseWallet } from '../controllers/walletController.js';
import Counter from '../models/Counter.js';

import Wallet from '../models/wallet.js';
import normalizePhoneNumber from '../utils/normalizePhone.js';
import { createTransferRecipient } from '../services/createTransferRecipient.js';

import mongoose from 'mongoose';
import initiateTransfer from '../services/initiateTransfer.js';
import getBankCode from '../services/getBankCode.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import GLTransaction from '../models/glTransactions.js';
import https from 'https';
import crypto from 'crypto';
import dotenv from 'dotenv';



// Function to verify transaction status
export const verifyTransaction = (reference) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${encodeURIComponent(reference)}`,
      method: 'GET',
      headers: {
        Authorization: `sk_test_a9e92811fea8194a021e096b6a46331a94b16165`, // Replace with actual Paystack secret key
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result); // Resolve with the parsed result
        } catch (err) {
          reject('Error parsing response: ' + err.message); // Reject if parsing fails
        }
      });
    });

    req.on('error', (error) => {
      reject('HTTPS Request Error: ' + error.message); // Reject on error
    });

    req.end();
  });
};

// Create a new purchase request
export const createPurchaseRequest = async (req, res) => {
  try {
    const {
      driverId, phoneNumber, requestType, vendorName, vendorContacts,
      vendorAccountNumber, vendorBankName, businessName, businessAddress,
      purchaseItem, vehicleNumber, amount, comment
    } = req.body;

    if (!driverId || !phoneNumber || !requestType || !vendorName || !vendorContacts ||
        !vendorAccountNumber || !vendorBankName || !businessName || !businessAddress ||
        !purchaseItem || !vehicleNumber || !amount || !comment) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newRequest = new PurchaseRequest({
      driverId, phoneNumber, requestType, vendorName, vendorContacts,
      vendorAccountNumber, vendorBankName, businessName, businessAddress,
      purchaseItem, vehicleNumber, amount, comment, status: 'Pending'
    });

    await newRequest.save();

    const formattedDate = moment(newRequest.dateRequested).format('DD-MM-YYYY[T]hh:mm:ss a');

    res.status(201).json({
      message: 'Purchase request created successfully',
      data: {
        ...newRequest.toObject(),
        dateRequested: formattedDate
      }
    });
  } catch (error) {
    console.error('Error creating purchase request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update purchase request status and disburse funds
export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, customer_id, vendorAccountNumber, vendorBankName } = req.body;

    if (!customer_id) {
      return res.status(400).json({ message: "customer_id is required for processing" });
    }

    const purchaseRequest = await PurchaseRequest.findById(id);
    if (!purchaseRequest) {
      return res.status(404).json({ message: "Purchase request not found" });
    }

    // Update fields
    purchaseRequest.status = status;
    if (vendorAccountNumber) purchaseRequest.vendorAccountNumber = vendorAccountNumber;
    if (vendorBankName) purchaseRequest.vendorBankName = vendorBankName;
    await purchaseRequest.save();

    if (status === 'Approved') {
      try {
        const bankCode = await getBankCode(purchaseRequest.vendorBankName);
        if (!bankCode) {
          return res.status(400).json({ message: "Invalid bank name or unable to retrieve bank code" });
        }

        const recipientCode = await new Promise((resolve, reject) => {
          const params = JSON.stringify({
            type: 'nuban',
            name: purchaseRequest.vendorName || "Unnamed Vendor",
            account_number: purchaseRequest.vendorAccountNumber,
            bank_code: bankCode,
            currency: 'NGN'
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

          const req = https.request(options, response => {
            let data = '';
            response.on('data', chunk => { data += chunk; });
            response.on('end', () => {
              const result = JSON.parse(data);
              if (result.status && result.data.recipient_code) {
                resolve(result.data.recipient_code);
              } else {
                reject(new Error(result.message || "Failed to create recipient"));
              }
            });
          });

          req.on('error', error => {
            reject(error);
          });

          req.write(params);
          req.end();
        });

        const reference = `PR-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const transfer = await initiateTransfer(
          recipientCode,
          purchaseRequest.amount * 100,
          `Payment for ${purchaseRequest.purchaseItem}`,
          reference
        );

        if (!transfer.status) {
          return res.status(500).json({
            message: "Failed to initiate Paystack transfer",
            transfer
          });
        }

        // Save reference and update status
        purchaseRequest.reference = reference;
        purchaseRequest.status = 'Paid';
        await purchaseRequest.save();

        // Log GL Transaction
        const counter = await Counter.findByIdAndUpdate(
          { _id: 'txnId' },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );

        const txnId = counter.seq;
        const glTransaction = new GLTransaction({
          txnId,
          glAcctId: `1000211030201-${txnId}`,
          glAcctNo: '1000211030201',
          txnType: 'DR',
          amount: mongoose.Types.Decimal128.fromString(purchaseRequest.amount.toString()),
          acct_no: purchaseRequest.vendorAccountNumber,
          name: purchaseRequest.vendorName || 'Unnamed Vendor',
          description: `Vendor payment for purchase request ${purchaseRequest._id}`,
          createdBy: 'system',
          customer_id,
          email: purchaseRequest.vendorEmail || '',
          phoneNumber: purchaseRequest.vendorPhone || ''
        });

        await glTransaction.save();

        console.log("✅ Paystack transfer successful and GL transaction saved.");
        return res.status(200).json({ message: "Purchase request updated and payment processed" });

      } catch (error) {
        console.error("❌ Error processing payment:", error);
        return res.status(500).json({ message: "Transfer failed", error: error.message });
      }
    } else {
      return res.status(200).json({ message: "Purchase request updated" });
    }
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Webhook Handler for Paystack
export const handleWebhook = async (req, res) => {
  try {
    const event = req.body;

    switch (event.event) {
      case 'transfer.success': {
        const transferRef = event.data.reference;
        const recipient = event.data.recipient?.name || 'unknown recipient';

        console.log(`✅ Transfer to ${recipient} succeeded for reference: ${transferRef}`);

        try {
          const purchaseRequest = await PurchaseRequest.findOne({ reference: transferRef });

          if (purchaseRequest) {
            purchaseRequest.status = 'Paid';
            await purchaseRequest.save();

            const txnId = `GLCONF-${new Date().getTime()}`;
            const glConfirm = new GLTransaction({
              txnId,
              glAcctId: `1000211030201-${txnId}`,
              glAcctNo: '1000211030201',
              txnType: 'CONFIRM',
              amount: mongoose.Types.Decimal128.fromString(purchaseRequest.amount.toString()),
              acct_no: purchaseRequest.vendorAccountNumber,
              name: purchaseRequest.vendorName || 'Unnamed Vendor',
              description: `Confirmed vendor payment for purchase request ${purchaseRequest._id}`,
              createdBy: 'webhook',
              customer_id: purchaseRequest.customer_id,
              email: purchaseRequest.vendorEmail || '',
              phoneNumber: purchaseRequest.vendorPhone || ''
            });

            await glConfirm.save();

            console.log("🧾 GL confirmation transaction saved.");
          } else {
            console.warn(`⚠️ No matching PurchaseRequest found for reference: ${transferRef}`);
          }
        } catch (err) {
          console.error("Error handling webhook:", err);
        }

        res.status(200).send("Webhook received and processed");
        break;
      }
      default:
        res.status(200).send("Event not processed");
        break;
    }
  } catch (error) {
    console.error("Webhook processing failed:", error);
    res.status(500).json({ message: "Webhook processing error", error: error.message });
  }
};


export const getAllPurchaseRequests = async (req, res) => {
  try {
    // Fetch all purchase requests from the database
    const purchaseRequests = await PurchaseRequest.find();

    if (!purchaseRequests || purchaseRequests.length === 0) {
      return res.status(404).json({ message: 'No purchase requests found' });
    }

    res.status(200).json({
      message: 'Purchase requests fetched successfully',
      data: purchaseRequests,
    });
  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getPurchaseRequestByPhoneNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.params; // Get phone number from URL parameters

    // Fetch purchase requests by phone number
    const purchaseRequests = await PurchaseRequest.find({ phoneNumber });

    if (!purchaseRequests || purchaseRequests.length === 0) {
      return res.status(404).json({ message: `No purchase requests found for phone number ${phoneNumber}` });
    }

    res.status(200).json({
      message: 'Purchase requests fetched successfully',
      data: purchaseRequests,
    });
  } catch (error) {
    console.error('Error fetching purchase request by phone number:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};