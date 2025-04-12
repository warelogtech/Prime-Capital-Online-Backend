import express from 'express';
import {
  createPurchaseRequest,
  getAllPurchaseRequests,
  getPurchaseRequestByPhoneNumber,
  updateRequestStatus
} from '../controllers/purchaseRequestController.js';

const router = express.Router();

// Create new purchase request
router.post('/purchase', createPurchaseRequest);

// Get all purchase requests
router.get('/', getAllPurchaseRequests);

// Get a single request by ID
router.get('/:phoneNumber', getPurchaseRequestByPhoneNumber);

// Update status of a request (Approve/Reject)
router.patch('/:phoneNumber/status', updateRequestStatus);

export default router;
