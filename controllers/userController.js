import bcrypt from 'bcryptjs';
import moment from 'moment';
import User from '../models/User.js';
import Otp from '../models/otpmodel.js';
import sendOTP from '../utils/sendOtp.js';
import CustomerIdentification from '../models/CustomerIdentification.js';
import { uploadToCloudinary } from '../utils/cloudinaryUpload.js';
import cloudinary from 'cloudinary';

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
      guarantorContacts,
      event,
      customerCode,
      identificationDetails,
      profileImage // base64 or leave blank if file upload
    } = req.body;

    const formattedPhoneNumber = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+${phoneNumber}`;

    const existingUser = await User.findOne({ phoneNumber: formattedPhoneNumber });
    if (existingUser) {
      return res.status(400).json({ message: "User already registered" });
    }

    if (!nin && (!bvn || bvn.trim() === '')) {
      return res.status(400).json({ message: "Either NIN or BVN is required" });
    }

    const parsedGuarantors = typeof guarantorContacts === 'string'
      ? JSON.parse(guarantorContacts)
      : guarantorContacts;

    const parsedIdDetails = typeof identificationDetails === 'string'
      ? JSON.parse(identificationDetails)
      : identificationDetails;

    if (!Array.isArray(parsedGuarantors) || parsedGuarantors.length === 0) {
      return res.status(400).json({
        message: "Guarantor contacts are required and must be an array.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let profileImageUrl = '';

    if (req.file) {
      const cloudinaryResult = await uploadToCloudinary(req.file.path);
      profileImageUrl = cloudinaryResult.secure_url;
    } else if (profileImage && profileImage.startsWith('data:image')) {
      const cloudinaryResult = await uploadToCloudinary(profileImage);
      profileImageUrl = cloudinaryResult.secure_url;
    }

    const userObj = {
      phoneNumber: formattedPhoneNumber,
      nin,
      firstName,
      lastName,
      password: hashedPassword,
      email,
      address,
      guarantorContacts: parsedGuarantors,
      identificationDetails: parsedIdDetails,
      profileImage: profileImageUrl
    };

    if (bvn && bvn.trim() !== '') {
      userObj.bvn = bvn;
    }

    const newUser = new User(userObj);
    await newUser.save();

    if (event && customerCode && identificationDetails) {
      await saveCustomerIdentification(
        newUser._id,
        customerCode,
        event,
        email,
        parsedIdDetails
      );
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
    };

    res.status(200).json({
      message: "User registered successfully. OTP sent. Please verify to complete registration.",
      user: formattedUser,
      otp // ⚠️ Remove this in production!
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// The function to save customer identification details after registration
export const saveCustomerIdentification = async (customerId, customerCode, event, email, identificationDetails) => {
  try {
    if (!event || !customerCode || !identificationDetails) {
      throw new Error('Missing identification data');
    }

    const customerIdentification = new CustomerIdentification({
      event,
      customer_id: customerId,
      customer_code: customerCode,
      email: email,
      identification: identificationDetails,
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
    const { profileImage, ...updatedFields } = req.body;

    let updatedUser;

    if (req.file) {
      // Upload to Cloudinary using buffer and stream
      const streamUpload = (buffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.v2.uploader.upload_stream(
            {
              folder: 'uploads',
              public_id: `images/${Date.now()}`,
              resource_type: 'image',
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          stream.end(buffer);
        });
      };

      const result = await streamUpload(req.file.buffer);
      updatedFields.profileImage = result.secure_url;
    } else if (profileImage && profileImage.startsWith('data:image')) {
      const cloudResult = await uploadToCloudinary(profileImage);
      updatedFields.profileImage = cloudResult.secure_url;
    }

    updatedUser = await User.findOneAndUpdate({ customer_id }, updatedFields, {
      new: true
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'User updated successfully', user: updatedUser });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error: error.message });
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

// Send OTP for password reset
export const sendResetOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const user = await User.findOne({ phoneNumber: formattedPhoneNumber });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    await Otp.deleteMany({ user: user._id });

    const newOtp = new Otp({
      user: user._id,
      otp,
      expiresAt: expiry,
    });

    await newOtp.save();
    const otpSent = await sendOTP(user.phoneNumber, otp);

    if (!otpSent) {
      return res.status(500).json({ message: "Failed to send OTP" });
    }

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Verify OTP
export const verifyResetOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ message: "Phone number and OTP are required." });
    }

    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const user = await User.findOne({ phoneNumber: formattedPhoneNumber });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const existingOtp = await Otp.findOne({ user: user._id, otp });
    if (!existingOtp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (existingOtp.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP has expired." });
    }

    res.status(200).json({ message: "OTP verified. You can now reset your password." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reset password (after OTP is verified)
export const resetPassword = async (req, res) => {
  try {
    const { phoneNumber, newPassword, verifyNewPassword } = req.body;

    if (!phoneNumber || !newPassword || !verifyNewPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (newPassword !== verifyNewPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const user = await User.findOne({ phoneNumber: formattedPhoneNumber });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    // Optional: delete all OTPs for user after successful reset
    await Otp.deleteMany({ user: user._id });

    res.status(200).json({ message: "Password successfully reset. You can now login." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// controllers/userController.js

// Update User Role
export const updateUserRole = async (req, res) => {
  const { customerId } = req.params; // Changed from userId to customerId
  const { newRole } = req.body;

  try {
    const user = await User.findOne({ customer_id: customerId }); // Use customer_id instead of _id
    if (user) {
      user.userType = newRole;
      await user.save();
      res.status(200).send('User role updated successfully');
    } else {
      res.status(404).send('User not found');
    }
  } catch (error) {
    res.status(500).send('Error updating user role');
  }
};


// Get user by phone number
export const getUserByPhoneNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    // Format the phone number if it does not start with a '+'
    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    // Look for the user in the database
    const user = await User.findOne({ phoneNumber: formattedPhoneNumber });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = {
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      address: user.address,
      profileImage: user.profileImage, // <-- ensure this field is returned
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json({ user: userData });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
