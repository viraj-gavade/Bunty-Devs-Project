
// Import the mongoose library to interact with MongoDB
const mongoose = require('mongoose');


 
// Create an asynchronous function to connect to MongoDB
const connectdb = async () => {
    try {
        // Attempt to connect to the MongoDB database using the connection URI and database name from environment variables
        const connect = await mongoose.connect(`${process.env.MONGO_URI}`);
        
        // Log a message confirming that the connection was successful, and display the host of the MongoDB connection
        console.log(`\n Connected to Database!!, Connection Host: ${connect.connection.host}`);
        
    } catch (error) {
        // If an error occurs during the connection attempt, log the error message
        console.log(`Error Occured`, error);
    }
};

// Export the connectdb function to be used in other parts of the application (e.g., in the main app file)
module.exports = connectdb;
