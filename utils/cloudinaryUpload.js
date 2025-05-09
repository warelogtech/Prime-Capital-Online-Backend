import fs from 'fs';
import path from 'path';
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Function to convert base64 image to file
const saveBase64ToFile = (base64Data) => {
  const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 format');
  }

  const extension = matches[1].split('/')[1]; // Extract file extension
  const buffer = Buffer.from(matches[2], 'base64'); // Decode base64
  const filePath = path.join('uploads', `${Date.now()}.${extension}`);

  fs.writeFileSync(filePath, buffer); // Save to file
  return filePath; // Return file path
};

// Upload to Cloudinary without watermark
export const uploadToCloudinary = async (filePathOrBase64) => {
  let filePath = filePathOrBase64;

  // Convert base64 to file if necessary
  if (filePathOrBase64.startsWith('data:image')) {
    filePath = saveBase64ToFile(filePathOrBase64);
  }

  try {
    const options = {
      folder: 'uploads',
      public_id: `images/${Date.now()}`,
      resource_type: 'auto',
      transformation: [
        {
          width: 500,
          crop: "scale"
        }
      ]
    };

    const response = await cloudinary.v2.uploader.upload(filePath, options);
    console.log('✅ Cloudinary Upload Success:', response);
    return response;
  } catch (error) {
    console.error('❌ Cloudinary Upload Error:', error);
    throw new Error('Error uploading image to Cloudinary: ' + error.message);
  }
};

// Handle base64 or file uploads without watermark
export const handleUserUploads = async (uploadedFiles) => {
  try {
    const filePaths = uploadedFiles.map(file =>
      file.startsWith('data:image') ? saveBase64ToFile(file) : file
    );

    const uploadPromises = filePaths.map(filePath =>
      uploadToCloudinary(filePath)
    );

    const responses = await Promise.all(uploadPromises);
    return responses;
  } catch (error) {
    console.error('❌ Error handling user uploads:', error);
    throw error;
  }
};

export default { uploadToCloudinary, handleUserUploads };