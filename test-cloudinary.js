import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // Import to handle `import.meta.url`

// Convert `import.meta.url` to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: 'dacmbt5wi',
  api_key: '182164991411812',
  api_secret: 'OWG7dRlnGxfupzPqXBRfNpJSdSA',
});

// Function to download and upload the image to Cloudinary
async function testCloudinary() {
  try {
    const uploadDir = path.join(__dirname, 'uploads'); // Ensure the uploads folder path
    const testImagePath = path.join(uploadDir, 'test-image.jpg'); // Image file path for test

    // Ensure the uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
      console.log('Uploads directory created');
    }

    // Download a test image from the internet
    const imageUrl = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2heEAr62IA8aYpqsaA_EiI-cMDzmaKRZGIA&s'; // Example image URL

    // Download the image using Axios
    const writer = fs.createWriteStream(testImagePath);
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream', // Stream the image data
    });

    // Pipe the image stream into the file
    response.data.pipe(writer);

    writer.on('finish', async () => {
      console.log('Test image downloaded successfully!');

      // Upload the image to Cloudinary after download completes
      await uploadToCloudinary(testImagePath);
    });

    writer.on('error', (err) => {
      console.error('Error downloading the image:', err);
    });

  } catch (error) {
    console.error('Error during Cloudinary upload process:', error);
  }
}

// Function to upload the image to Cloudinary with a watermark
async function uploadToCloudinary(filePath) {
  try {
    const response = await cloudinary.uploader.upload(filePath, {
      folder: 'uploads', // Folder name on Cloudinary
      transformation: [
        {
          overlay: {
            font_family: "Arial",
            font_size: 50,
            text: "warelogtech",
          },
          gravity: "south_east",
          color: "white",
          opacity: 70,
          x: 10,
          y: 10,
        },
      ],
    });
    console.log('Cloudinary Upload Success:', response);
  } catch (error) {
    console.error('Cloudinary Upload Error:', error); // Log any errors during upload
  }
}

// Call the function to run the test
testCloudinary();
