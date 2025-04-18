import mongoose from 'mongoose';

const GuarantorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relationship: { type: String, required: true },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    customer_id: {
      type: String, // changed from Number
      required: false,
      unique: true,
      index: true,
      match: [/^\d{7}$/, 'Customer ID must be 7 digits'],
    },
    
    phoneNumber: { type: String, required: true, unique: true },
    nin: { type: String, unique: true, sparse: true },
    bvn: {
      type: String,
      unique: true,
      sparse: true, // allows multiple documents with missing or empty BVN
    },
    
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true },
    email: {
      type: String,
      required: true,
      match: [/.+@.+\..+/, 'Please enter a valid email address'],
    },
    address: { type: String, required: true },
    
    guarantorContacts: {
      type: [GuarantorSchema],
      required: true,
    },
    userType: { 
      type: String, 
      enum: ['user', 'admin', 'superuser'], 
      default: 'user' // default to 'user' if not provided
    }, 
  },
  { timestamps: true }
);


UserSchema.pre('save', async function (next) {
  if (this.isNew && !this.customer_id) {
    try {
      const lastUser = await mongoose.models.User.findOne({}).sort({ customer_id: -1 }).limit(1);
      
      let nextId = 1;
      if (lastUser && lastUser.customer_id) {
        nextId = parseInt(lastUser.customer_id, 10) + 1;
      }
      
      // Pad to 7 digits
      this.customer_id = nextId.toString().padStart(7, '0');

      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});


export default mongoose.models.User || mongoose.model('User', UserSchema);
