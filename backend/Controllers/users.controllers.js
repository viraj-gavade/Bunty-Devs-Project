
// Importing utility functions for asynchronous error handling
const asyncHandler = require('../utils/asynchandler') // AsyncHandler middleware to handle asynchronous code errors

// Importing the User model to interact with the user data in the database
const User = require('../Models/users.models') // User model for database operations related to users

// Function to generate both Access and Refresh tokens for a given user
const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        // Fetch user from database using userId
        const user = await User.findById(userId)

        // Generate Access and Refresh tokens using methods defined in the User model
        const accessToken = await user.createAccestoken()
        const refreshToken = await user.createRefreshtoken()

        // Store the generated refresh token in the user's record
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        // Return both tokens for client-side usage
        return { accessToken, refreshToken }
    } catch (error) {
        // Log the error and throw a custom API error if token generation fails
        console.log("Access token Error:-", error)
        throw new CustomApiError(500, 'Something went wrong while generating the access and refresh token!')
    }
}

// Async handler to manage user registration logic
const registerUser = asyncHandler(async (req, res) => {
    // Destructure request body to get the user input
    const { username, email, fullname, password, confirm_password } = req.body

    // Check for empty fields and throw a custom error if any field is missing
    if ([username, email, fullname, password, confirm_password].some((field) =>
        field?.trim() === ''
    )) {
        throw new CustomApiError(400, 'All fields must be filled!')
    }

    // Check if a user with the same username or email already exists in the database
    const exstinguser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (exstinguser) {
        throw new CustomApiError(409, 'User already exists')
    }

    // Check if the avatar file was uploaded, and throw an error if not
    const avatarLocalpath = req.files?.avatar[0]?.path
    const coverImageLocalpath = req.files?.coverImage[0]?.path
    if (avatarLocalpath === undefined) {
        throw new CustomApiError(404, 'Avatar must be uploaded!')
    }

    // Upload avatar and cover image to Cloudinary
    const avatar = await uploadFile(avatarLocalpath)
    const coverImage = await uploadFile(coverImageLocalpath)

    // Validate if avatar upload was successful
    if (!avatar) {
        throw new CustomApiError(400, 'Avatar file is required')
    }

    // Validate password match
    if (password !== confirm_password) {
        throw new CustomApiError(400, 'Passwords do not match')
    }

    // Create new user record in the database
    const user = await User.create({
        avatar: avatar.url,
        coverImage: coverImage?.url || '',
        fullname,
        email,
        username: username.toLowerCase(),
        password: confirm_password
    })

    // Fetch the created user without sensitive fields like password and refreshToken
    const createdUser = await User.findById(user._id).select(
        '-password -refreshToken'
    )

    // Throw an error if user creation fails
    if (!createdUser) {
        throw new CustomApiError(500, 'Server was unable to create the user please try again later!')
    }

    // Redirect the user to the signup confirmation page
    return res.redirect('/api/v1/auth/user/signup')
})



// Async handler to manage user login functionality


const loginUser = asyncHandler(async (req, res) => {
    // Destructure request body to get email, password, and username
    const { email, password, username } = req.body
    

    // Check if email and password are provided
    if (!email || !password) {
        throw new CustomApiError(400, 'Please provide all the required fields')
    }

    // Find the user by email or username
    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    // Throw an error if user is not found
    if (!user) {
        throw new CustomApiError(404, 'User not found!')
    }

    // Check if the provided password matches the stored password
    const ValidPassword = await user.isPasswordCorrect(password)
    if (!ValidPassword) {
        throw new CustomApiError(401, 'Invalid user credentials!')
    }

    // Generate access and refresh tokens for the logged-in user
    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

    // Fetch the logged-in user without sensitive fields like password and refreshToken
    const loggedInUser = await User.findById(user._id).select('-password -refreshToken')

    // Cookie options for secure and HTTP-only cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    // Send the generated tokens in cookies and redirect to home page
    return res.status(200).cookie('accessToken', accessToken, options).cookie('refreshToken', refreshToken, options).redirect(
        '/home'
    )
})

// Async handler to manage user logout functionality
const logoutUser = asyncHandler(async (req, res) => {
    // Cookie options to clear the cookies securely
    const options = {
        httpOnly: true,
        secure: true
    }

    // Clear access and refresh tokens cookies and return a response
    return res.status(200).clearCookie('accessToken', options).clearCookie('refreshToken', options).json(
        new ApiResponse(200, 'User Logged Out Successfully!')
    )
})



// Async handler to refresh the access token using the provided refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
    // Extract the incoming refresh token from cookies or body
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    // Throw an error if no refresh token is provided
    if (!incomingRefreshToken) {
        throw new CustomApiError(401, 'Unauthorized Request')
    }

    try {
        // Verify the refresh token using the secret key
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRETE)

        // Find the user associated with the refresh token
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new CustomApiError(401, 'Invalid refresh token')
        }

        // Check if the refresh token matches the one stored in the user's document
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new CustomApiError(401, 'Refresh token is invalid or used!')
        }

        // Options for setting the cookies securely
        const options = {
            httpOnly: true,
            secure: true
        }

        // Generate new access and refresh tokens
        const { NewrefreshToken, accessToken } = await generateAccessTokenAndRefreshToken(user?._id)

        // Send the new access and refresh tokens in response cookies
        return res.status(200).cookie('accessToken', accessToken).cookie('refreshToken', NewrefreshToken).json(
            new ApiResponse(
                200,
                'Access Token Refreshed!',
                { accessToken, refreshToken: NewrefreshToken }
            )
        )

    } catch (error) {
        // Handle errors and throw custom API error if refresh token verification fails
        throw new CustomApiError(401, error?.message || 'Invalid refresh Token!')
    }
})

// Async handler to change the current password for the logged-in user
const changeCurrentPassword = asyncHandler(async (req, res) => {
    try {
        // Destructure new and old password from request body
        const { oldPassword, newPassword, confirm_password } = req.body

        // Find the user using the logged-in user's ID
        const user = await User.findById(req.user._id)

        // Check if the provided old password matches the stored password
        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
        if (!isPasswordCorrect) {
            throw new CustomApiError(401, 'The old password you have entered is not correct!')
        }

        // Validate if new password matches the confirm password
        if (newPassword !== confirm_password) {
            throw new CustomApiError(401, 'The new password and confirm password you have entered are not the same!')
        }

        // Update the user's password
        user.password = newPassword

        // Save the updated user information
        await user.save({ validateBeforeSave: true })

        // Redirect the user to their channel page after successful password change
        return res.redirect(`/api/v1/auth/user/channel/${req.user.username}`)

    } catch (error) {
        // Log error and throw custom error for any issues during password change
        console.log(error)
        throw new CustomApiError(500, 'Something went wrong while changing the password please try again later!')
    }
})

// Async handler to fetch the current user's information
const getCurrentUser = asyncHandler(async (req, res) => {
    // Return the logged-in user's information in the response
    res.status(200).json(
        new ApiResponse(200, 'Current User fetched successfully!', req.user)
    )
})


// Async handler to update the user's avatar
const updateUserAvtar = asyncHandler(async (req, res) => {
    // Get the file path of the avatar uploaded by the user
    const avatarLocalpath = req.file?.path
    
    // Throw an error if the avatar file is not provided
    if (!avatarLocalpath) {
        throw new CustomApiError(400, 'Avatar file is missing')
    }

    // Upload the avatar to Cloudinary
    const avatar = await uploadFile(avatarLocalpath)
    
    // Throw an error if there is an issue uploading the avatar to Cloudinary
    if (!avatar.url) {
        throw new CustomApiError(400, 'Error while uploading on Cloudinary!')
    }

    // Update the user's avatar URL in the database
    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            avatar: avatar?.url
        }
    }, { new: true }).select('-password') // Exclude password field from the response

    // Redirect the user to their channel page after successful avatar update
    return res.redirect(`/api/v1/auth/user/channel/${req.user.username}`)
}) //Checked and bugs fixed


// Async handler to update the user's cover image
const updateUsercoverImage = asyncHandler(async (req, res) => {
    // Get the file path of the cover image uploaded by the user
    const coverImageLocalpath = req.file?.path
    
    // Throw an error if the cover image file is not provided
    if (!coverImageLocalpath) {
        throw new CustomApiError(400, 'Cover Image file is missing')
    }

    // Upload the cover image to Cloudinary
    const coverImage = await uploadFile(coverImageLocalpath)
    
    // Throw an error if there is an issue uploading the cover image to Cloudinary
    if (!coverImage.url) {
        throw new CustomApiError(400, 'Error while uploading on Cloudinary!')
    }

    // Update the user's cover image URL in the database
    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            coverImage: coverImage?.url
        }
    }, { new: true }).select('-password') // Exclude password field from the response

    // Redirect the user to their channel page after successful cover image update
    return res.redirect(`/api/v1/auth/user/channel/${req.user.username}`)
}) //Checked and bugs fixed



// Async handler to change the user's email address
const changeUserEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Throw an error if email is not provided
    if (!email) {
        throw new CustomApiError(402, 'Please provide the email in order to change the email');
    }

    // Check if a user already exists with the new email
    const existinguser = await User.findOne({ email });
    if (existinguser) {
        throw new CustomApiError(401, 'User already exists with this email id');
    }

    // Fetch the user by ID and check if user exists
    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new CustomApiError(401, 'Unable to get the user ID, maybe an unauthorized request!');
    }

    // Update the user's email and save it
    user.email = email;
    await user.save({ validateBeforeSave: false });

    // Redirect to the user's channel page after email update
    return res.redirect(`/api/v1/auth/user/channel/${req.user.username}`);
});

// Async handler to change the user's username
const changeUserUsername = asyncHandler(async (req, res) => {
    const UserId = req.user?._id;

    // Check if the user ID is present
    if (!UserId) {
        throw new CustomApiError(401, 'User ID not found! Maybe an unauthorized request');
    }

    const { username, confirm_username } = req.body;

    // Throw an error if username is not provided
    if (!username) {
        throw new CustomApiError(402, 'Please provide the username to change the username!');
    }

    // Check if the username already exists in the system
    const existinguser = await User.findOne({ username });
    if (existinguser) {
        throw new CustomApiError(402, 'Username is already taken. Please try another username');
    }

    // Fetch the user by ID
    const user = await User.findById(UserId);
    if (!user) {
        throw new CustomApiError(402, 'Unable to find the user. Please check the user ID again!');
    }

    // Ensure the username and confirm_username match
    if (username !== confirm_username) {
        return res.status(403).json(
            new customApiResponse(402, 'Username does not match with confirm username')
        );
    }

    // Update the username and save the changes
    user.username = username;
    await user.save({ validateBeforeSave: false });

    // Redirect to the user's channel page after the username update
    return res.redirect(`/api/v1/auth/user/channel/${user.username}`);
});


// Async handler to change the user's full name
const changeUserfullname = asyncHandler(async (req, res) => {
    const UserId = req.user?._id;

    // Check if user ID is present
    if (!UserId) {
        throw new CustomApiError(401, 'User ID not found! Maybe an unauthorized request');
    }

    const { fullname, confirm_fullname } = req.body;

    // Throw an error if fullname is not provided
    if (!fullname) {
        throw new CustomApiError(402, 'Please provide the fullname to change the fullname!');
    }

    // Check if another user already has the same fullname
    const existinguser = await User.findOne({ fullname });
    if (existinguser) {
        throw new CustomApiError(402, 'Username is already taken. Please try another username');
    }

    // Fetch the user by ID
    const user = await User.findById(UserId);
    if (!user) {
        throw new CustomApiError(402, 'Unable to find the user. Please check the user ID again!');
    }

    // Ensure the fullname and confirm_fullname match
    if (fullname !== confirm_fullname) {
        return res.status(403).json(
            new customApiResponse(402, 'Fullname does not match with confirm fullname')
        );
    }

    // Update the fullname and save the changes
    user.fullname = fullname;
    await user.save({ validateBeforeSave: false });

    // Redirect to the user's channel page after the fullname update
    return res.redirect(`/api/v1/auth/user/channel/${req.user.username}`);
});



// Async handler to remove a specific video from the user's watch history
const RemoveVideoFromHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params; // Assuming videoId is passed as a URL parameter

    // Remove the specific video from the user's watchHistory
    const userHistory = await User.findByIdAndUpdate(
        req.user._id,
        { $pull: { watchHistory: videoId } }, // Remove videoId from watchHistory array
        { new: true } // Return the updated document
    );

    // Check if user exists
    if (!userHistory) {
        throw new CustomApiError(404, 'User not found!');
    }


    // Redirect to the user's watch history page after removing the video
    return res.redirect('/api/v1/auth/user/watchHistory');
});









module.exports = {
    loginUser,                  // Function to log the user in
    registerUser,               // Function to register a new user
    logoutUser,                 // Function to log the user out
    refreshAccessToken,         // Function to refresh the user's access token
    changeCurrentPassword,      // Function to change the current user's password
    getCurrentUser,             // Function to fetch the current user's information
    updateUserAvtar,            // Function to update the user's avatar
    updateUsercoverImage,       // Function to update the user's cover image
    changeUserEmail,            // Function to change the user's email
    changeUserUsername,         // Function to change the user's username
    changeUserfullname,         // Function to change the user's full name
    
};
