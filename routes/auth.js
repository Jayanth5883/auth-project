// 4. REST API: This router implements authentication resources with HTTP endpoints:
// register, login, profile, refresh, logout, and admin.
// 5. Bcrypt: Passwords are hashed during registration and compared during login.
// 6. JWT: jsonwebtoken creates and verifies signed authentication tokens.
// 7. Access + refresh tokens: Access tokens are short-lived; refresh tokens are
// longer-lived and are used to obtain new access tokens.
// 8. Cookies: The refresh token is stored in an HTTP-only cookie.
// 10. Authorization + RBAC: The admin endpoint combines authentication with
// role-based access control.

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

// Import the email queue so we can add
// a background job after user registration.
import emailQueue from "../queues/emailQueue.js";


// Create router
const router = express.Router();




// ==================================================
// REGISTER
// ==================================================
//
// POST /auth/register
//
// Used to create a new user.
// 13. Security validation: Validate required fields, normalize the email,
// check its format, and enforce the minimum password length before database use.
// ==================================================

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@gmail.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: User already exists
 */
router.post("/register", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check that both fields were provided
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Remove unnecessary spaces from the email
        const cleanEmail = email.trim().toLowerCase();

        // Basic email validation
        if (!cleanEmail.includes("@")) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }
        0
        // Require a minimum password length
        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        // Check whether the email already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [cleanEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "User already exists"
            });
        }

        // 5. Bcrypt: Hash the password before storing it; the plain password is not saved.
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store the validated email and hashed password
        const result = await pool.query(
            `INSERT INTO users (email, password)
             VALUES ($1, $2)
             RETURNING id, email, created_at`,
            [cleanEmail, hashedPassword]
        );
        // Add a background job to the email queue.
        // Redis will store this job until the worker processes it.
        await emailQueue.add("welcomeEmail", {
            email: email,
        });

        res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });

    } catch (error) {
        // 14. Error handling: Log the server-side error while returning a safe response.
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

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in and issue access and refresh tokens
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful; refresh token is set in an HTTP-only cookie
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid email or password
 */
router.post("/login", async (req, res) => {

    try {

        // Get email and password from request
        const { email, password } = req.body;
        const cleanEmail = email.trim().toLowerCase();


        // 13. Security validation: Reject incomplete login input before querying the database.
        // Check input
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }


        // Find user by email
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [cleanEmail]
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


        // 7. Access token: A short-lived JWT is returned to the client for API access.
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


        // 7. Refresh token: A longer-lived JWT allows the client to request a new access token.
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


        // 8. Cookies: Store the refresh token in an HTTP-only cookie so JavaScript cannot read it.
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
        // 14. Error handling: Do not expose authentication or database internals to the client.

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

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get the authenticated user's profile
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user's profile
 *       401:
 *         description: Missing or invalid access token
 *       404:
 *         description: User not found
 */
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
            // 14. Error handling: Return a safe response when the protected profile lookup fails.

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

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Issue a new access token from the refresh-token cookie
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Missing, invalid, or expired refresh token
 */
router.post("/refresh", (req, res) => {

    // 7. Refresh-token flow: Read and verify the refresh token before issuing a new access token.
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

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out and clear the refresh-token cookie
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", (req, res) => {

    // Delete refresh token cookie
    res.clearCookie("refreshToken");

    res.json({
        message: "Logout successful"
    });
});

/**
 * @swagger
 * /auth/admin:
 *   get:
 *     summary: Access the admin-only endpoint
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin access granted
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Access denied for non-admin users
 */
router.get(
    "/admin",
    // 10. Authorization + RBAC: Authentication runs first, then only an admin may continue.
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