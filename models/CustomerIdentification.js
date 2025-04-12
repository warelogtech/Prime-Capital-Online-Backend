import mongoose from 'mongoose';

// Identification Schema for storing BVN, account number, etc.
const IdentificationSchema = new mongoose.Schema({
  country: { type: String, required: true },
  type: { type: String, required: true },
  bvn: { type: String },
  account_number: { type: String },
  bank_code: { type: String }
}, { _id: false }); // _id set to false as it's a subdocument

// CustomerIdentification Schema
const CustomerIdentificationSchema = new mongoose.Schema({
  event: { type: String, required: true },
  customer_id: { type: Number, required: true }, // customer_id as a number
  customer_code: { type: String, required: true },
  email: { type: String, required: true },
  identification: { type: IdentificationSchema, required: true }, // Subdocument to store identification details
  receivedAt: { type: Date, default: Date.now }
});

export default mongoose.models.CustomerIdentification || mongoose.model('CustomerIdentification', CustomerIdentificationSchema);
