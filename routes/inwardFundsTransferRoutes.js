import express from 'express';
import controller from '../controllers/inwardFundsTransferController.js';

const router = express.Router();

router.post('/', controller.createInwardFundsTransfer);
router.get('/', controller.getAllTransfers);
router.get('/:id', controller.getTransferById);
router.put('/:id', controller.updateTransfer);
router.delete('/:id', controller.deleteTransfer);

export default router;
