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
      type: Number,
      required: false,
      unique: true,
      index: true,
    },
    phoneNumber: { type: String, required: true, unique: true },
    nin: { type: String, unique: true, sparse: true },
    bvn: { type: String, unique: true, sparse: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true },
    email: {
      type: String,
      required: true,
      match: [/.+@.+\..+/, 'Please enter a valid email address'],
    },
    address: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    guarantorContacts: {
      type: [GuarantorSchema],
      required: true,
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
      this.customer_id = nextId; // Generate a new customer_id
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
