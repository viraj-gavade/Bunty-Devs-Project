
require('dotenv').config(); // Load environment variables from .env file
const express = require('express'); // Import Express framework for routing
const cookieParser = require('cookie-parser'); // Middleware to parse cookies
const connectdb = require('./DataBase/connection'); // Database connection utility
const cors = require('cors'); // Middleware to enable Cross-Origin Resource Sharing (CORS)


 
const UserRouter = require('./Routes/user.routes'); // User-related API routes
const VerifyJwt = require('./Middlewares/auth'); // Middleware to verify JWT tokens

const app = express(); // Create an Express application
const port = process.env.PORT || 3000; // Set the port from environment variable or default to 3000

// Middleware Setup
app.use(express.json()); // Parse incoming JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

app.use(cookieParser()); // Initialize cookie parser
app.use(cors()); // Enable CORS

// API Routes Setup
app.use('/api/v1/auth/user', UserRouter); // User authentication-related routes

// Database Connection and Server Initialization
const ConnectDB = async () => {
  try {
    await connectdb(); // Connect to the database 
    app.listen(port, () => {
      console.log(`Server is listening on port: ${port}`); // Log when the server starts
    });
  } catch (error) {
    console.error('Something Went Wrong!!', error); // Log any connection errors
    process.exit(1); // Exit process if connection fails
  }
};

// Start the server and establish database connection
ConnectDB();
