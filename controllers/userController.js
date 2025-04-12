import bcrypt from 'bcryptjs';
import moment from 'moment';
import User from '../models/User.js';
import Otp from '../models/otpmodel.js';
import sendOTP from '../utils/sendOtp.js';
import CustomerIdentification from '../models/CustomerIdentification.js';

// Register User
export const registerUser = async (req, res) => {
  try {
    const {
      phoneNumber,
      nin,
      bvn,
      firstName,
      lastName,
      password,
      email,
      address,
      vehicleNumber,
      guarantorContacts,
      event, // Assuming this is part of the request body for the identification
      customerCode, // Assuming this is part of the request body for the identification
      identificationDetails, // Assuming this is part of the request body for identification details like BVN, account number, etc.
    } = req.body;

    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    const existingUser = await User.findOne({ phoneNumber: formattedPhoneNumber });
    if (existingUser) {
      return res.status(400).json({ message: "User already registered" });
    }

    if (!nin && !bvn) {
      return res.status(400).json({ message: "Either NIN or BVN is required" });
    }

    if (!Array.isArray(guarantorContacts) || guarantorContacts.length === 0) {
      return res.status(400).json({
        message: "Guarantor contacts are required and must be an array.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      phoneNumber: formattedPhoneNumber,
      nin,
      bvn,
      firstName,
      lastName,
      password: hashedPassword,
      email,
      address,
      vehicleNumber,
      guarantorContacts,
    });

    await newUser.save();

    // Log user data to check customer_id
    console.log(newUser); // Ensure customer_id is populated

    // Save customer identification details (Added after registration)
    if (event && customerCode && identificationDetails) {
      console.log(event, customerCode, identificationDetails); // Ensure correct values
      await saveCustomerIdentification(newUser.customer_id, customerCode, event, email, identificationDetails);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    await Otp.deleteMany({ user: newUser._id });

    const newOtp = new Otp({
      user: newUser._id,
      otp,
      expiresAt: expiry,
    });
    await newOtp.save();

    const otpSent = await sendOTP(newUser.phoneNumber, otp);
    if (!otpSent) {
      return res.status(500).json({ message: "Failed to send OTP" });
    }

    const formattedUser = {
      ...newUser.toObject(),
      createdAt: moment(newUser.createdAt).format("DD-MM-YYYY[T]hh:mm:ss a"),
      updatedAt: moment(newUser.updatedAt).format("DD-MM-YYYY[T]hh:mm:ss a"),
      customer_id: newUser.customer_id, // Ensure it's a number
    };

    res.status(200).json({
      message: "User registered successfully. OTP sent. Please verify to complete registration.",
      user: formattedUser,
      otp, // Remove in production
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// The function to save customer identification details after registration
export const saveCustomerIdentification = async (customerId, customerCode, event, email, identificationDetails) => {
  try {
    console.log('Saving customer identification:', { customerId, customerCode, event, email, identificationDetails }); // Log the data

    const customerIdentification = new CustomerIdentification({
      event, 
      customer_id: customerId,
      customer_code: customerCode,
      email: email,
      identification: identificationDetails, // e.g., BVN, account number, bank code
    });

    await customerIdentification.save();
    console.log('Customer identification details saved successfully');
  } catch (error) {
    console.error('Error saving customer identification:', error.message);
  }
};



// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a user by customer_id
export const updateUser = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const updatedUser = await User.findOneAndUpdate({ customer_id }, req.body, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a user by customer_id
export const deleteUser = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const deletedUser = await User.findOneAndDelete({ customer_id });

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
