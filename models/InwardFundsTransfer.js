import mongoose from 'mongoose';
import Counter from './Counter.js';

const InwardFundsTransferSchema = new mongoose.Schema({
  inwdFundsXferId: { type: Number, required: true, unique: true },
  xferRef: { type: String, required: true, unique: true },
  paymentMethodCode: String,
  chargesPayerCode: String,
  xferCurrencyId: { type: Number, required: true },
  xferAmount: { type: mongoose.Types.Decimal128, required: true, default: 0 },
  sendingBankCharge: mongoose.Types.Decimal128,
  receivingBankCharge: mongoose.Types.Decimal128,
  totalCharge: mongoose.Types.Decimal128,
  netAmountTransferred: mongoose.Types.Decimal128,
  payCurrencyId: { type: Number, required: true },
  payExchangeRate: { type: mongoose.Types.Decimal128, required: true },
  payAmount: mongoose.Types.Decimal128,
  lcyEquivalent: mongoose.Types.Decimal128,
  valueDate: { type: Date, required: true },
  priorityLevelCode: { type: String, required: true },
  supplementaryRef: String,
  xferPurposeId: Number,
  payDetails: String,
  fundsXferTypeId: Number,
  businessUnitId: Number,
  beneficiary: {
    name: {type: String, required: true},
    acct_no: { type: String, required: true },
    addressLine1: String,
    addressLine2: String,
    addressLine3: String,
    addressLine4: String,
    telNo: String,
    bicId: { type: Number, required: false },
    bankName: { type: String, required: false },
    branch: String,
    bankCityId: Number,
    bankStateCounty: String,
    bankCountryId: { type: Number, required: false },
    bankTelNo: String,
    id: Number,
    identTypeId: Number,
    secretQA: String
  },
  remitter: {
    name: { type: String, required: true },
    accountNo: String,
    addressLine1: String,
    addressLine2: String,
    addressLine3: String,
    addressLine4: String,
    telNo: String,
    identTypeId: Number,
    identNo: String,
    bicId: Number,
    bankName: String,
    branchName: String,
    bankCityId: Number,
    bankStateCounty: String,
    bankTelNo: String,
    bankCountryId: Number
  },
  intermediaryBanks: {
    sendingInstitutionBankId: Number,
    orderingInstitutionBankId: Number,
    senderCorrespondentBankId: Number,
    receiverCorrespondentBankId: Number,
    thirdReimbursementBankId: Number,
    intermediaryBankId: Number
  },
  recSt: { type: String, enum: ['A', 'I', 'P'], required: true },
  versionNo: { type: Number, required: true },
  rowTs: { type: Date, required: true },
  userId: { type: String, required: true },
  createDt: { type: Date, required: true },
  createdBy: { type: String, required: true },
  sysCreateTs: { type: Date, required: true },
  additionalInstructions: {
    instruction1: String,
    instruction2: String,
    instruction3: String,
    instruction4: String,
    instructionCode1: String,
    instructionCode2: String,
    instructionCode3: String,
    instructionCode4: String
  },
  specInstruction: String,
  extInwdFundsXferId: Number,
  repairFlag: { type: String, enum: ['Y', 'N'], required: true },
  foreignIftFlag: { type: String, enum: ['Y', 'N'], required: true }
});

// Pre-save hook for ID and xferRef generation
InwardFundsTransferSchema.pre('save', async function (next) {
    console.log('InwardFundsTransfer document before save:', this);
  
    if (!this.inwdFundsXferId) {
      // Log the current counter before updating
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'inwdFundsXferId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
  
      console.log('Counter value:', counter.seq); // Log counter seq
  
      // Ensure inwdFundsXferId is correctly set
      this.inwdFundsXferId = counter.seq;
      this.xferRef = `0000072${counter.seq.toString().padStart(10, '0')}`;
    }
  
    // Check again after setting
    console.log('Document with generated inwdFundsXferId:', this);
  
    next();
  });
  
  

export default mongoose.models.InwardFundsTransfer || mongoose.model('InwardFundsTransfer', InwardFundsTransferSchema);
