import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { initiateTransfer } from './services/initiateTransfer.js';
import { createTransferRecipient } from './services/createTransferRecipient.js';
import CustomerIdentification from './models/CustomerIdentification.js';

dotenv.config();

const router = express.Router();
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const rawBody = req.body.toString();

    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      return res.status(401).send('Unauthorized: Invalid signature');
    }

    const event = JSON.parse(rawBody);
    console.log('✅ Webhook Event Received:', event.event);
    console.log('📦 Full Payload:', JSON.stringify(event, null, 2));

    switch (event.event) {
      case 'charge.success': {
        const customerEmail = event.data.customer.email;
        const amount = event.data.amount;
        const reference = event.data.reference;

        console.log(`💵 Payment received from ${customerEmail}: NGN ${amount / 100}`);

        try {
          const recipientCode = await createTransferRecipient({
            name: event.data.customer.name || 'Paystack Customer',
            account_number: event.data.metadata?.account_number,
            bank_name: event.data.metadata?.bank_name
          });

          if (!recipientCode) {
            throw new Error('Recipient code is undefined or invalid');
          }

          const transfer = await initiateTransfer(
            recipientCode,
            amount,
            `Auto payout for ref: ${reference}`
          );

          console.log('✅ Transfer initiated:', transfer);
        } catch (err) {
          console.error('❌ Error in Paystack transfer process:', err.message);
        }

        break;
      }

      case 'transfer.success': {
        const transferRef = event.data.reference;
        const recipient = event.data.recipient?.name || 'unknown recipient';
        console.log(`✅ Transfer to ${recipient} succeeded for reference: ${transferRef}`);

        // TODO: Update database to mark transfer as complete
        break;
      }

      case 'transfer.failed': {
        const transferRef = event.data.reference;
        const reason = event.data.failures?.reason || 'unspecified reason';
        console.warn(`❌ Transfer failed for reference: ${transferRef}, Reason: ${reason}`);

        // TODO: Alert admin or schedule a retry
        break;
      }

      case 'customeridentification.failed': {
        const { customer_id, customer_code, email, identification, reason } = event.data;

        const identificationData = {
          event: event.event,
          customer_id,
          customer_code,
          email,
          identification,
          reason
        };

        try {
          await CustomerIdentification.create(identificationData);
          console.log('❌ Customer identification failed for:', email, 'Reason:', reason);
        } catch (dbError) {
          console.error('❌ Failed to save customer identification failure:', dbError);
        }

        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.event}`);
    }

    res.status(200).json({ message: 'Webhook received and processed.' });
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
