// routes/externalCredit.js
import express from 'express';
import ExternalCredit from '../models/ExternalCredit.js';

const router = express.Router();

router.post('/external-credit', async (req, res) => {
  try {
    const data = req.body;
    const newCredit = new ExternalCredit(data);
    await newCredit.save();
    res.status(201).json({ message: 'External credit recorded successfully', data: newCredit });
  } catch (error) {
    console.error('External credit error:', error);
    res.status(500).json({ message: 'Failed to record external credit', error: error.message });
  }
});

export default router;
