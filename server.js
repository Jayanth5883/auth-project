// 1. Node.js: This project runs on the Node.js runtime.
// 2. Express.js: Express creates the HTTP server and routes requests.
// 4. REST API: The application exposes HTTP endpoints such as GET and POST routes.
// 9. Middleware: Express middleware processes request bodies and cookies before routes.

// Import Express
import express from "express";

// Import dotenv to read .env
import dotenv from "dotenv";

// 8. Cookies: cookie-parser reads cookies sent by the client, including the refresh-token cookie.
// Import cookie-parser to read cookies
import cookieParser from "cookie-parser";

// Import authentication routes
import authRoutes from "./routes/auth.js";

import userRoutesV1 from "./routes/v1/users.js"

import userRoutesV2 from "./routes/v2/users.js";

// 14. Error handling: Import the centralized error-handling middleware.
// Importing the error handler from middleware
import errorHandler from "./middleware/errorHandler.js";

// 15. IDOR protection: Import the route that checks whether a user may access
// the requested profile ID.
// Importing (---IDOR---) protected route
import profileRoutes from "./routes/v1/profile.js";

// 16. Secrets management: Load DATABASE_URL and JWT secrets from the environment.
// Load environment variables
dotenv.config();

// Create Express application
const app = express();

// Get port from .env
const PORT = process.env.PORT || 3000;


// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

// 9. Middleware: This middleware allows Express to read JSON request bodies.
//
// Example:
// {
//     "email": "test@gmail.com",
//     "password": "123456"
// }
app.use(express.json());

// Allows Express to read cookies sent by the browser/Postman
app.use(cookieParser());


// --------------------------------------------------
// ROUTES
// --------------------------------------------------

// All authentication routes start with /auth
//
// Example:
// POST /auth/register
// POST /auth/login
// GET  /auth/profile
app.use("/auth", authRoutes);


//API version 1
app.use("/api/v1/users", userRoutesV1);


// API Version 2
app.use("/api/v2/users", userRoutesV2);

// idor protected route 
app.use("/api/v1/profile", profileRoutes);

// --------------------------------------------------
// TEST ROUTE
// --------------------------------------------------

app.get("/", (req, res) => {
    res.send("Authentication server is running");
});

// 14. Error handling: This must be registered after routes so forwarded errors
// are handled consistently without exposing internal details to clients.
// Central error handler
// This must be registered after the routes
app.use(errorHandler);

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});