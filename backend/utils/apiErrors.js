
class CustomApiError extends Error {
    constructor(
        StatusCode, // The HTTP status code for the error (e.g., 400, 500)
        message = 'Something Went Wrong!', // The error message (defaults to a generic message)
        errors = [], // Optional: an array of errors or details (e.g., validation errors)
        stack = '' // Optional: the stack trace (used if available)
    ) {
        // Call the parent class constructor (Error) with the error message
        super(message);

        // Set the custom properties on the error object
        this.StatusCode = StatusCode; // The HTTP status code
        this.message = message; // The error message
        this.errors = errors; // Array of errors or details (if any)
        this.data = null; // Default value for additional data, can be customized
        this.success = false; // Set success flag to false (indicating failure)

        // If a stack trace is provided, assign it, otherwise capture it
        if (stack) {
            this.stack = stack; // Use the provided stack trace
        } else {
            Error.captureStackTrace(this, this.constructor); // Capture stack trace
        }
    }
}

module.exports = CustomApiError; // Export the class for use in other files
