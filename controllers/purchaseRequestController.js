import moment from 'moment';
import PurchaseRequest from '../models/PurchaseRequest.js';
import { disburseWallet } from './walletController.js';
import GLTransaction from '../models/glTransactions.js';
import normalizePhoneNumber from '../utils/normalizePhone.js';

// Create a new purchase request
export const createPurchaseRequest = async (req, res) => {
  try {
    const {
      driverId,
      phoneNumber,
      requestType,
      vendorName,
      vendorContacts,
      businessName,
      businessAddress,
      purchaseItem,
      amount,
      comment
    } = req.body;

    if (!driverId || !phoneNumber || !requestType || !vendorName || !vendorContacts || !businessName || !businessAddress || !purchaseItem || !amount ||!comment) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newRequest = new PurchaseRequest({
      driverId,
      phoneNumber,
      requestType,
      vendorName,
      vendorContacts,
      businessName,
      businessAddress,
      purchaseItem,
      amount,
      comment
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


// Get all purchase requests (without populate)
export const getAllPurchaseRequests = async (req, res) => {
    try {
      const requests = await PurchaseRequest.find(); // No .populate()
  
      res.status(200).json({
        message: 'All purchase requests retrieved',
        count: requests.length,
        data: requests
      });
    } catch (error) {
      console.error('Error getting purchase requests:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  
// Get a single purchase request by phoneNumber
export const getPurchaseRequestByPhoneNumber = async (req, res) => {
    try {
      const { phoneNumber } = req.params;  // Use phoneNumber from request params
  
      // Find the purchase request by phoneNumber
      const request = await PurchaseRequest.findOne({ phoneNumber });
  
      if (!request) {
        return res.status(404).json({ message: 'Purchase request not found' });
      }
  
      res.status(200).json({ data: request });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  

  export const updateRequestStatus = async (req, res) => {
    try {
      const { status } = req.body;
  
      // Validate status
      if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
  
      // Find the request and update its status
      const request = await PurchaseRequest.findOneAndUpdate(
        { phoneNumber: req.params.phoneNumber },
        { status },
        { new: true }
      );
  
      if (!request) {
        return res.status(404).json({ message: 'Request not found' });
      }
  
      // If status is Approved, disburse loan to wallet
      if (status === 'Approved') {
        let { phoneNumber, amount } = request;
  
        // Convert to string and remove '234' if present
        phoneNumber = String(phoneNumber);
        if (phoneNumber.startsWith('234')) {
          phoneNumber = phoneNumber.slice(3);
        }
  
        // Disburse to wallet using helper
        const disbursementResult = await disburseWallet({
          acct_no: phoneNumber,
          amount,
          description: `Loan Disbursement for Purchase Request ID: ${request._id}`
        });
  
        // Check if disbursement was successful
        if (disbursementResult.status !== 200) {
          return res
            .status(disbursementResult.status)
            .json({ message: 'Wallet disbursement failed', ...disbursementResult });
        }
      }
  
      // Respond with success
      return res.status(200).json({
        message: `Request status updated to ${status}`,
        data: request
      });
  
    } catch (error) {
      console.error('Update request status error:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };