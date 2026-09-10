// Import Express
import express from "express";

// Import bcrypt for password hashing
import bcrypt from "bcrypt";

// Import JWT
import jwt from "jsonwebtoken";

// Import PostgreSQL connection
import pool from "../db.js";

// Import authentication middleware
import authenticateJWT from "../middleware/authMiddleware.js";

//Importing the middleware authorize role
import authorizeRole from "../middleware/authorizeRole.js";


// Create router
const router = express.Router();


// ==================================================
// REGISTER
// ==================================================
//
// POST /auth/register
//
// Used to create a new user.
// ==================================================

router.post("/register", async (req, res) => {

    try {

        // Get email and password from request body
        const { email, password } = req.body;


        // Check whether email and password were provided
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }


        // Check whether user already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );


        // If a user already exists
        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "User already exists"
            });
        }


        // Hash the password
        //
        // bcrypt does NOT store the original password.
        // It creates a one-way hash.
        const hashedPassword = await bcrypt.hash(password, 10);


        // Insert user into PostgreSQL
        const result = await pool.query(
            `INSERT INTO users (email, password)
             VALUES ($1, $2)
             RETURNING id, email, created_at`,
            [email, hashedPassword]
        );


        // Send successful response
        res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// ==================================================
// LOGIN
// ==================================================
//
// POST /auth/login
//
// Checks email/password and creates:
// 1. Access token
// 2. Refresh token
// ==================================================

router.post("/login", async (req, res) => {

    try {

        // Get email and password from request
        const { email, password } = req.body;


        // Check input
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }


        // Find user by email
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );


        // User doesn't exist
        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }


        // Get user from database
        const user = result.rows[0];


        // Compare entered password with hashed password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );


        // Password doesn't match
        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }


        // --------------------------------------------------
        // CREATE ACCESS TOKEN
        // --------------------------------------------------

        const accessToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },

            process.env.ACCESS_TOKEN_SECRET,

            {
                expiresIn: "15m"
            }
        );


        // --------------------------------------------------
        // CREATE REFRESH TOKEN
        // --------------------------------------------------

        const refreshToken = jwt.sign(
            {
                id: user.id
            },

            process.env.REFRESH_TOKEN_SECRET,

            {
                expiresIn: "7d"
            }
        );


        // --------------------------------------------------
        // STORE REFRESH TOKEN IN COOKIE
        // --------------------------------------------------

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,

            // Use true when using HTTPS in production
            secure: false,

            // Helps protect against CSRF
            sameSite: "strict",

            // Cookie expires after 7 days
            maxAge: 7 * 24 * 60 * 60 * 1000
        });


        // Send access token to client
        res.json({
            message: "Login successful",

            accessToken
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// ==================================================
// PROFILE
// ==================================================
//
// GET /auth/profile
//
// This is a protected route.
// User must send a valid access token.
// ==================================================

router.get(
    "/profile",
    authenticateJWT,
    async (req, res) => {

        try {

            // req.user was created by authenticateJWT
            const userId = req.user.id;


            // Get user from database
            const result = await pool.query(
                `SELECT id, email, created_at
                 FROM users
                 WHERE id = $1`,
                [userId]
            );


            // User not found
            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: "User not found"
                });
            }


            // Send user information
            res.json({
                user: result.rows[0]
            });


        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: "Server error"
            });
        }
    }
);


// ==================================================
// REFRESH TOKEN
// ==================================================
//
// POST /auth/refresh
//
// Creates a new access token using the refresh token.
// ==================================================

router.post("/refresh", (req, res) => {

    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;


    // Check whether refresh token exists
    if (!refreshToken) {
        return res.status(401).json({
            message: "Refresh token is missing"
        });
    }


    try {

        // Verify refresh token
        const decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );


        // Create new access token
        const accessToken = jwt.sign(
            {
                id: decoded.id
            },

            process.env.ACCESS_TOKEN_SECRET,

            {
                expiresIn: "15m"
            }
        );


        // Send new access token
        res.json({
            accessToken
        });


    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired refresh token"
        });
    }
});


// ==================================================
// LOGOUT
// ==================================================
//
// POST /auth/logout
//
// Deletes the refresh-token cookie.
// ==================================================

router.post("/logout", (req, res) => {

    // Delete refresh token cookie
    res.clearCookie("refreshToken");

    res.json({
        message: "Logout successful"
    });
});

router.get(
    "/admin",
    authenticateJWT,
    authorizeRole("admin"),
    (req, res) => {

        res.json({
            message: "Welcome Admin",
            user: req.user
        });

    }
);

// Export router
export default router;