import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.TERMII_BASE_URL;
const API_KEY = process.env.TERMII_API_KEY;

const sendOTP = async (phoneNumber, otp) => {
  try {
    const message = `Your PCO OTP is: ${otp}. It expires in 60 minutes.`; // Updated expiration time to 60 minutes

    const data = {
      to: phoneNumber,
      from: "WareLogTech", // Use your registered Termii sender ID
      sms: message,
      type: "plain",
      channel: "generic",
      api_key: API_KEY,
    };

    // Send the OTP via Termii API
    const response = await axios.post(`${BASE_URL}/api/sms/send`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.data?.message === 'Successfully Sent') {
      console.log('OTP sent successfully:', response.data);
      return true;
    } else {
      console.error('Failed to send OTP:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Error sending OTP:', error.response?.data || error.message);
    return false;
  }
};

export default sendOTP;
