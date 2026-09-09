// Import Express
import express from "express";

// Import dotenv to read .env
import dotenv from "dotenv";

// Import cookie-parser to read cookies
import cookieParser from "cookie-parser";

// Import authentication routes
import authRoutes from "./routes/auth.js";

// Load environment variables
dotenv.config();

// Create Express application
const app = express();

// Get port from .env
const PORT = process.env.PORT || 3000;


// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

// Allows Express to read JSON request bodies.
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


// --------------------------------------------------
// TEST ROUTE
// --------------------------------------------------

app.get("/", (req, res) => {
    res.send("Authentication server is running");
});


// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});