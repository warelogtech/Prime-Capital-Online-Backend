import bcrypt from 'bcryptjs';
import Otp from '../models/otpmodel.js';
import User from '../models/User.js';
import sendOTP from '../utils/sendOtp.js';
import Wallet from '../models/wallet.js'; 
import jwt from 'jsonwebtoken';

export const signinUser = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: "Invalid phone number or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid phone number or password" });
    }

    // Remove the +234 prefix from the phone number to generate acct_no
    const acct_no = phoneNumber.replace('+234', '').slice(-10); // Take the last 10 digits

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, phoneNumber: user.phoneNumber }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    // Check or create wallet using acct_no
    let wallet = await Wallet.findOne({ acct_no });

    if (!wallet) {
      // Ensure that the wallet is created with the generated user customer_id
      const newWallet = await Wallet.create({ 
        name: `${user.firstName} ${user.lastName}`,  // Added required name field
        acct_no,
        walletBalance: 0, 
        loanBalance: 0,
        netBalance: 0,
        customer_id: user.customer_id, // Use the user-generated customer_id
      });
      
      wallet = newWallet;
    }

    // Respond with login success
    res.status(200).json({
      message: "Login successful",
      user: {
        phoneNumber: user.phoneNumber,
        acct_no,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      walletBalance: wallet.walletBalance,
      loanBalance: wallet.loanBalance,
      netBalance: wallet.netBalance,
      token,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




export const verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body; // Only extract phoneNumber and otp from the request body

    // Ensure that phoneNumber and otp are provided in the request
    if (!phoneNumber || !otp) {
      return res.status(400).json({ message: "Phone number and OTP are required" });
    }

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    // Find OTP document for this user
    const otpDoc = await Otp.findOne({ user: user._id, otp });
    if (!otpDoc || new Date() > otpDoc.expiresAt) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Clear OTP after verification
    await Otp.deleteMany({ user: user._id });

    // Respond with success message and user details (no wallet creation)
    res.status(200).json({
      message: "OTP verification successful",
      user: {
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




export const signoutUser = async (req, res) => {
  try {
    // Clear the JWT token from the client side (this should be handled on the client, too)
    // Since JWT is stateless, there’s no need to delete anything from the server side
    
    res.status(200).json({ message: "Successfully logged out" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Delete the user's associated wallet using phoneNumber as acct_no
    await Wallet.deleteOne({ phoneNumber: user.phoneNumber });

    // Delete the user's OTP records
    await Otp.deleteMany({ user: user._id });

    // Delete the user account
    await User.deleteOne({ phoneNumber });

    res.status(200).json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
