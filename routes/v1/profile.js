// 15. IDOR protection: This route verifies that the requested profile belongs
// to the logged-in user, unless the authenticated user has the admin role.
// Profile routes
import express from "express";
import pool from "../../db.js";
import authenticateJWT from "../../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/profile/{id}:
 *   get:
 *     summary: Get a user's profile
 *     tags:
 *       - Profiles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: User ID
 *     responses:
 *       200:
 *         description: User profile
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Access denied for this profile
 *       404:
 *         description: User not found
 */

// Get a user's profile
router.get("/:id", authenticateJWT, async (req, res, next) => {

    try {
        // Get the ID from the URL
        // Example: /api/v1/profile/5
        const requestedUserId = Number(req.params.id);

        // Get the ID of the logged-in user from the verified JWT
        const loggedInUserId = req.user.id;

        // 13. Security validation: Validate the URL ID before using it in the query.
        // Check that the URL ID is a valid number
        if (!Number.isInteger(requestedUserId)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        // 15. IDOR protection: Prevent insecure direct object reference access
        // by comparing the requested ID with the authenticated user's ID.
        // IDOR protection:
        // A normal user can only access their own profile.
        if (
            requestedUserId !== loggedInUserId &&
            req.user.role !== "admin"
        ) {
            return res.status(403).json({
                message: "You are not allowed to access this profile"
            });
        }

        // Get the requested user's data
        const result = await pool.query(
            `SELECT id, email, role, created_at
             FROM users
             WHERE id = $1`,
            [requestedUserId]
        );

        // User doesn't exist
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Send the user's profile
        res.json({
            user: result.rows[0]
        });

    } catch (error) {

        // 14. Error handling: Forward unexpected errors to the central handler.
        // Send unexpected errors to the central error handler
        next(error);
    }
});

export default router;