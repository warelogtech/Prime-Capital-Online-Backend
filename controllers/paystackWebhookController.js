// controllers/paystackWebhook.js
import { updateTransactionStatus } from '../services/updateTransaction.js';

export const handlePaystackWebhook = async (req, res) => {
  const event = req.body;

  if (!event || !event.event) {
    return res.status(400).send('Invalid event data');
  }

  switch (event.event) {
    case 'transfer.reversed':
      const data = event.data;

      console.log('Transfer reversed:', {
        reference: data.reference,
        reason: data.reason,
        status: data.status,
        recipient_name: data.recipient?.name,
        bank: data.recipient?.details?.bank_name,
      });

      await updateTransactionStatus(data.reference, data.status, data.reason);
      break;

    case 'transfer.success':
      // handle success if needed
      break;

    case 'transfer.failed':
      // handle failure
      break;

    default:
      console.log(`Unhandled Paystack event: ${event.event}`);
  }

  res.sendStatus(200); // Acknowledge receipt
};
