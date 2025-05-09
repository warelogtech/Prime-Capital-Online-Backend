import mongoose from 'mongoose';

const PurchaseRequestSchema = new mongoose.Schema({
  driverId: {
    type: String,
    ref: 'User',
    required: true,
  },
  phoneNumber: {
    type: Number,
    required: true
  },
  requestType: {
    type: String,
    enum: [
      'Vehicle Repair',
      'Tyre Purchase',
      'Battery Purchase',
      'Bus Engine Purchase',
      'Oil Change',
      'Brake Pads Replacement',
      'Windscreen/Wiper Replacement',
      'Gearbox Repair',
      'Radiator Repair or Replacement',
      'Light Bulbs / Electrical Fix',
      'Fuel Filter Change',
      'Suspension System Repair',
      'Other Essential Items'
    ],
    required: true
  },
  vendorName: {
    type: String,
    required: true
  },
  vendorContacts: {
    type: String,
    required: true
  },
  vendorAccountNumber: {
    type: String,
    required: true
  },
  vendorBankName: {
    type: String,
    required: true
  },
  businessName: {
    type: String,
    required: true
  },
  businessAddress: {
    type: String,
    required: true
  },
  purchaseItem: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  comment: {
    type: String,
    required: true
  },
  vehicleNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  dateRequested: {
    type: Date,
    default: Date.now
  }
});

const PurchaseRequest = mongoose.model('PurchaseRequest', PurchaseRequestSchema);

export default PurchaseRequest;
