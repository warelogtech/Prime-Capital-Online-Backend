import express from 'express';
import {
  createPurchaseRequest,
  getAllPurchaseRequests,
  getPurchaseRequestByPhoneNumber,
  updateRequestStatus,
  handleWebhook // Make sure you're importing this function
} from '../controllers/purchaseRequestController.js';

const router = express.Router();  // Use router instead of app

// Create new purchase request
router.post('/purchase', createPurchaseRequest);

// Get all purchase requests
router.get('/', getAllPurchaseRequests);

// Get a single request by ID
router.get('/:phoneNumber', getPurchaseRequestByPhoneNumber);

// Update status of a request (Approve/Reject)
router.put('/status/:id', updateRequestStatus);  // Call the imported updateRequestStatus function here

// Webhook for Paystack events
router.post('/paystack/webhook', handleWebhook);  // Add the webhook handler route here

export default router;
