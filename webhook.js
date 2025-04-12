import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import CustomerIdentification from './models/CustomerIdentification.js';

dotenv.config();

const router = express.Router();
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Get the Paystack signature from the request header
    const signature = req.headers['x-paystack-signature'];

    // Convert raw body (buffer) to string and parse
    const rawBody = req.body.toString();
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET)
      .update(rawBody)
      .digest('hex');

    // Compare hash and signature
    if (hash !== signature) {
      return res.status(401).send('Unauthorized: Invalid signature');
    }

    // Parse the JSON body
    const event = JSON.parse(rawBody);

    console.log('✅ Webhook Event Received:', event.event);

    // Handle customer identification success event
    if (event.event === 'customeridentification.success') {
      const { customer_id, customer_code, email, identification } = event.data;

      const identificationData = {
        event: event.event,
        customer_id,
        customer_code,
        email,
        identification
      };

      // Save customer identification info
      await CustomerIdentification.create(identificationData);

      // Optionally update your User model if you want to link this to a user
      // await User.findOneAndUpdate({ email }, { isVerified: true });

      console.log('✅ Customer identification saved for:', email);
      return res.status(200).json({ message: 'Customer identification saved successfully.' });
    }

    // Handle other Paystack events, like charge.success
    if (event.event === 'charge.success') {
      const customer = event.data.customer;
      const amount = event.data.amount;
      const reference = event.data.reference;

      console.log(`💵 Payment received from ${customer.email}: NGN ${amount / 100}`);
      // You can handle payment logic here
    }

    res.status(200).json({ message: 'Webhook received and processed.' });
  } catch (error) {
    console.error('❌ Error handling Paystack webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
