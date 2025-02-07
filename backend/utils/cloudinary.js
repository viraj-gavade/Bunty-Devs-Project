
const { v2 } = require('cloudinary'); // Import the Cloudinary v2 SDK
const fs = require('fs'); // Import the fs (file system) module to interact with files

// Configure Cloudinary with your account's credentials (stored in environment variables)
v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Cloud name for your Cloudinary account
  api_key: process.env.CLOUDINARY_API_KEY, // API key for Cloudinary
  api_secret: process.env.CLOUDINARY_SECRETE_KEY // API secret for Cloudinary
});

// Function to upload a file to Cloudinary
const uploadFile = async (Filepath) => {
  try {
    // If no file path is provided, return null (indicating no file to upload)
    if (!Filepath) {
      return null;
    }

    // Attempt to upload the file to Cloudinary using its uploader API
    const response = await v2.uploader.upload(Filepath, {
      resource_type: 'auto', // Automatically detect the resource type (image, video, etc.)
    });

    // Check if the file exists on the local filesystem before attempting to delete it
    if (fs.existsSync(Filepath)) {
      // Delete the file from the local system after it's uploaded to Cloudinary
      fs.unlinkSync(Filepath); // Synchronously removes the file
    }

    // Return the Cloudinary response, which includes file details like URL, public ID, etc.
    return response;
  } catch (error) {
    // In case of any errors during the upload process, log the error message
    console.error('Error uploading file:', error);

    // Ensure that the file is deleted from the local system even if an error occurs
    if (fs.existsSync(Filepath)) {
      // Delete the file from the local system
      fs.unlinkSync(Filepath);
    }

    // Return null to indicate that the upload failed
    return null;
  }
};

// Export the uploadFile function so it can be used in other parts of the application
module.exports = uploadFile;
