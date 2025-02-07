
// Importing necessary libraries for mongoose, bcryptjs, and jwt
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Define the user schema for MongoDB
const UserSchema = mongoose.Schema({
  
    // 'username' field: Required, unique, lowercase, and trimmed
    username: {
        type: String, // String type for the username
        required: true, // Ensures the username must be provided
        unique: true, // Ensures no two users can have the same username
        lowercase: true, // Converts the username to lowercase automatically
        trim: true, // Removes any leading or trailing spaces
        index: true, // Creates an index on the username field for faster querying
    },

    // 'email' field: Required, unique, lowercase, and trimmed
    email: {
        type: String, // String type for the email
        required: true, // Ensures the email must be provided
        unique: true, // Ensures no two users can have the same email
        lowercase: true, // Converts the email to lowercase automatically
        trim: true, // Removes any leading or trailing spaces
    },

    // 'fullname' field: Required and indexed
    fullname: {
        type: String, // String type for the full name
        required: true, // Ensures the full name must be provided
        index: true, // Creates an index on the fullname field for faster querying
        trim: true, // Removes any leading or trailing spaces
    },

    // 'avatar' field: Default value set for a profile picture
    avatar: {
        type: String, // String type for the avatar image URL
        default: "https://static.vecteezy.com/system/resources/previews/024/983/914/non_2x/simple-user-default-icon-free-png.png", // Default avatar image URL
        required: true, // Ensures the avatar must be provided (or use default)
    },

    // 'coverImage' field: Default value for a cover photo
    coverImage: {
        type: String, // String type for the cover image URL
        default: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRF33NHxM7qEJwv1ouSYlpE_5WQmKRf4Qznyw&s" // Default cover image URL
    },

    // 'watchHistory' field: Array of references to videos
    watchHistory: [
        {
            type: mongoose.Schema.Types.ObjectId, // Stores the ObjectId of videos
            ref: 'Video' // Refers to the 'Video' model, creating a relationship
        }
    ],

    // 'password' field: Required field for user password
    password: {
        type: String, // String type for the password
        required: [true, 'Password is required!'] // Ensures the password must be provided
    },

    // 'refreshToken' field: Optional field to store the refresh token for the user
    refreshToken: {
        type: String // String type for the refresh token
    }

}, { timestamps: true }); // Timestamps automatically added for 'createdAt' and 'updatedAt'

// Middleware to hash the user's password before saving to the database
UserSchema.pre('save', async function (next) {
    // If the password is not modified, skip hashing
    if (!this.isModified('password')) {
        return next();
    }

    // Generate a salt with 10 rounds
    const salt = await bcryptjs.genSalt(10);
    
    // Hash the password using the salt
    this.password = await bcryptjs.hash(this.password, salt);
    
    // Proceed to save the user
    next();
});

// Instance method to compare the provided password with the stored hashed password
UserSchema.methods.isPasswordCorrect = async function (password) {
    // Compare the plain text password with the hashed password in the database
    return await bcryptjs.compare(password, this.password);
};

// Instance method to generate an access token for the user
UserSchema.methods.createAccestoken = async function () {
    // Create a JWT access token containing user data (user ID, username, fullname, email)
    const accessToken = await jwt.sign({
        _id: this._id,
        username: this.username,
        fullname: this.fullname,
        email: this.email
    }, process.env.ACCESS_TOKEN_SECRETE, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY // Set the expiry time for the token
    });
    return accessToken; // Return the generated access token
};

// Instance method to generate a refresh token for the user
UserSchema.methods.createRefreshtoken = async function () {
    // Create a JWT refresh token containing user ID
    const refreshToken = jwt.sign({
        _id: this._id,
    }, process.env.REFRESH_TOKEN_SECRETE, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY // Set the expiry time for the refresh token
    });
    return refreshToken; // Return the generated refresh token
};

// Export the 'User' model based on the schema
module.exports = mongoose.model('User', UserSchema);
