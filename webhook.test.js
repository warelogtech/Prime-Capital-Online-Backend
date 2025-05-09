import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import webhook from './webhook.js'; // Adjust path if needed

dotenv.config();

const app = express();

// Mount webhook before express.json to use raw body parsing
app.use('/api', webhook);

describe('Paystack Webhook', () => {
  it('should accept a valid webhook event', async () => {
    const payload = {
      event: 'charge.success',
      data: {
        amount: 500000,
        reference: 'test_ref_123',
        customer: {
          email: 'test@example.com',
        },
      },
    };

    const stringPayload = JSON.stringify(payload);

    // Create hash with your secret key
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY) // Corrected variable name
      .update(stringPayload)
      .digest('hex');

    const res = await request(app)
      .post('/api/webhook')
      .set('x-paystack-signature', hash)
      .set('Content-Type', 'application/json')
      .send(stringPayload);

    expect(res.statusCode).toBe(200);
  });

  it('should reject webhook with invalid signature', async () => {
    const payload = {
      event: 'charge.success',
      data: {
        amount: 500000,
        reference: 'test_ref_456',
        customer: {
          email: 'fake@example.com',
        },
      },
    };

    const stringPayload = JSON.stringify(payload);

    const res = await request(app)
      .post('/api/webhook')
      .set('x-paystack-signature', 'invalidsignature123')
      .set('Content-Type', 'application/json')
      .send(stringPayload);

    expect(res.statusCode).toBe(401);
    expect(res.text).toBe('Unauthorized: Invalid signature'); // Corrected expected message
  });
});
