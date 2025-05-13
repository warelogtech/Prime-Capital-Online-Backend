import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { initiateTransfer } from './services/initiateTransfer.js';
import { initiateBulkTransfer } from './services/initiateBulkTransfer.js'; // ✅ Imported
import { createTransferRecipient } from './services/createTransferRecipient.js';
import CustomerIdentification from './models/CustomerIdentification.js';

dotenv.config();

const router = express.Router();
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
   const rawBody = req.body.toString('utf8');


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

    const data = event.data;

    switch (event.event) {
      case 'charge.success': {
        const customerEmail = data.customer.email;
        const amount = data.amount;
        const reference = data.reference;

        console.log(`💵 Payment received from ${customerEmail}: NGN ${amount / 100}`);

        try {
          const metadata = data.metadata;

          if (Array.isArray(metadata?.bulk_recipients) && metadata.bulk_recipients.length > 0) {
            // ✅ Handle Bulk Transfer
            const bulkTransfers = [];

            for (const recipientData of metadata.bulk_recipients) {
              const recipientCode = await createTransferRecipient({
                name: recipientData.name || 'Paystack Bulk Recipient',
                account_number: recipientData.account_number,
                bank_name: recipientData.bank_name
              });

              if (!recipientCode) {
                console.warn('⚠️ Skipping invalid recipient during bulk creation.');
                continue;
              }

              bulkTransfers.push({
                recipient: recipientCode,
                amount: recipientData.amount,
                reason: recipientData.reason || `Bulk payout for ref: ${reference}`
              });
            }

            if (bulkTransfers.length > 0) {
              const bulkResponse = await initiateBulkTransfer(bulkTransfers);
              console.log('📤 Bulk Transfer Response:', bulkResponse);
            } else {
              console.warn('⚠️ No valid recipients available for bulk transfer.');
            }

          } else {
            // ✅ Handle Single Transfer
            const recipientCode = await createTransferRecipient({
              name: data.customer.name || 'Paystack Customer',
              account_number: metadata?.account_number,
              bank_name: metadata?.bank_name
            });

            if (!recipientCode) {
              throw new Error('Recipient code is undefined or invalid');
            }

            const transfer = await initiateTransfer(
              recipientCode,
              amount,
              `Auto payout for ref: ${reference}`,
              reference
            );

            console.log('✅ Transfer initiated:', transfer);
          }

        } catch (err) {
          console.error('❌ Error in Paystack transfer process:', err.message);
        }

        break;
      }

      case 'transfer.success': {
        const transferRef = data.reference;
        const recipient = data.recipient?.name || 'unknown recipient';
        console.log(`✅ Transfer to ${recipient} succeeded for reference: ${transferRef}`);
        break;
      }

      case 'transfer.failed': {
        const transferRef = data.reference;
        const reason = data.failures?.reason || 'unspecified reason';
        console.warn(`❌ Transfer failed for reference: ${transferRef}, Reason: ${reason}`);
        break;
      }

      case 'transfer.reversed': {
        const {
          reference,
          reason,
          amount,
          status,
          transfer_code,
          recipient,
          updated_at
        } = data;

        console.warn(`🔁 Transfer Reversed:
          Reference: ${reference}
          Status: ${status}
          Reason: ${reason}
          Amount: ₦${amount / 100}
          Recipient: ${recipient?.name}
          Bank: ${recipient?.details?.bank_name}
          Time: ${updated_at}
        `);
        break;
      }

      case 'customeridentification.failed': {
        const { customer_id, customer_code, email, identification, reason } = data;

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
