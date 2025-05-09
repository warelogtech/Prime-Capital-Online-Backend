import express from 'express';
import getBankCode from '../services/getBankCode.js';  // adjust this path as needed

const router = express.Router();

// Route to get bank code for a given bank name
router.get('/get-bank-code', async (req, res) => {
  const { bankName } = req.query;

  try {
    const result = await getBankCode(bankName);

    // If a specific bank was requested and not found
    if (bankName && result === "Bank not found") {
      return res.status(404).json({ message: `Bank code not found for ${bankName}` });
    }

    // If all banks were returned
    if (!bankName && Array.isArray(result)) {
      return res.json({ banks: result });
    }

    // Respond with found bank code
    return res.json({ bankName, bankCode: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching bank code', error });
  }
});

export default router;
