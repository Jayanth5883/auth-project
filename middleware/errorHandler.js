// 14. Error handling: Centralize unexpected errors and return a safe public message.
// The detailed error is logged server-side and is not exposed to the client.
// Central error-handling middleware
const errorHandler = (err, req, res, next) => {

    // Print the actual error in the terminal
    console.error(err);

    // Send a safe error message to the client
    res.status(500).json({
        message: "Internal server error"
    });
};

export default errorHandler;