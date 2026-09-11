// Import jsonwebtoken
import jwt from "jsonwebtoken";


// 9. Middleware: This function runs before protected route handlers.
// 6. JWT: It verifies the JSON Web Token with the access-token secret.
// 10. Authentication: A valid access token identifies the signed-in user.
// Middleware used to protect routes
const authenticateJWT = (req, res, next) => {

    // Get Authorization header
    //
    // Example:
    // Authorization: Bearer eyJhbGciOiJIUzI1Ni...
    const authHeader = req.headers.authorization;


    // Check whether Authorization header exists
    if (!authHeader) {
        return res.status(401).json({
            message: "Access token is required"
        });
    }


    // Split:
    //
    // "Bearer abc123"
    //
    // into:
    //
    // ["Bearer", "abc123"]
    const parts = authHeader.split(" ");


    // Make sure the format is correct
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({
            message: "Invalid Authorization header"
        });
    }


    // Get the actual token
    const token = parts[1];


    try {

        // 16. Secrets management: The JWT signing secret is supplied by the environment.
        // Verify the token using our secret
        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );


        // Store decoded user information in req.user
        //
        // Other routes can now use req.user
        req.user = decoded;


        // Continue to the next middleware/route
        next();

    } catch (error) {

        // Token is invalid or expired
        return res.status(401).json({
            message: "Invalid or expired access token"
        });
    }
};


export default authenticateJWT;