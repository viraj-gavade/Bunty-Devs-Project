
const asyncHandler = (fn) => {
    return (req, res, next) => {
      // Wrap the async function in a Promise
      Promise.resolve(fn(req, res, next))
        .catch((err) => next(err)); // If the promise is rejected, pass the error to the next middleware
    };
  };
  
  module.exports = asyncHandler;
  