// models/Counter.js
import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    required: true 
  },
  seq: { 
    type: Number, 
    default: 1000000000000  // Start from 13-digit number
  },
});

const Counter = mongoose.model('Counter', counterSchema);

export default Counter;
