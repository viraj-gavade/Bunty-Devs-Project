
// Import necessary dependencies and modules
const CustomApiError = require("../utils/apiErrors");  // Custom error handler to create error responses
const jwt = require('jsonwebtoken');  // JWT library to verify JSON Web Tokens
const User = require('../Models/users.models');  // User model to interact with the database
const asyncHandler = require('../utils/asynchandler');  // A utility to handle async functions gracefully

// Middleware function to verify the JWT token and authenticate the user
const VerifyJwt = asyncHandler(async (req, res, next) => {
    try {
        // Retrieve the token from cookies or the Authorization header (Bearer token)
        const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');

        // If no token is found, redirect the user to the signin page
        if (!token) {
            return res.redirect('/api/v1/auth/user/signin');
        }

        // Verify the token using the secret stored in environment variables
        const decodedtoken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE);

        // Find the user associated with the decoded token (_id)
        const user = await User.findById(decodedtoken._id).select('-password -refreshToken');  // Exclude password and refreshToken from the response

        // If no user is found, redirect the user to the signin page
        if (!user) {
            return res.redirect('/api/v1/auth/user/signin');
        }

        // Attach the user to the request object to be used in subsequent middleware or routes
        req.user = user;

        // Proceed to the next middleware function or route handler
        next();
        
    } catch (error) {
        // If any error occurs during the process, log it and throw a custom error
        console.log(error);

        // Throw a custom error with a message indicating invalid access or token
        throw new CustomApiError(401, error?.message || 'Invalid access');
    }
});

// Export the middleware function to be used in other parts of the application
module.exports = VerifyJwt;
