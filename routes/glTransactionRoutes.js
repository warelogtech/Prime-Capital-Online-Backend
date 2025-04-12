// routes/glTransactionRoutes.js
import express from 'express';
import { createGLTransaction, getAllGLTransactions } from '../controllers/glTransactionController.js';


const router = express.Router();

router.post('/gl-transactions', createGLTransaction);
router.get('/gl-transactions', getAllGLTransactions);

export default router;
