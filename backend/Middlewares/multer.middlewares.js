
// Import the multer module for handling file uploads
const multer = require('multer');

// Configure storage settings for file uploads
const storage = multer.diskStorage({
    // Define the destination folder for uploaded files
    destination: function (req, file, cb) {
        // The uploaded files will be saved in the 'public/temp' folder
        cb(null, './public/temp');
    },
    
    // Define the filename for the uploaded file
    filename: function (req, file, cb) {
        // The original file name will be used as the uploaded file's name
        cb(null, file.originalname);
    }
});

// Set up the multer instance using the storage configuration
const upload = multer({ storage: storage });

// Export the upload instance to use in other parts of the application
module.exports = upload;
