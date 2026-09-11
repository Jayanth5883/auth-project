import express from "express";
import pool from "../../db.js";
import authenticateJWT from "../../middleware/authMiddleware.js";
import authorizeRole from "../../middleware/authorizeRole.js";

const router = express.Router();

router.get(
    "/",
    authenticateJWT,
    authorizeRole("admin"),
    async (req, res) => {

        try {
            // Get pagination values from URL
            // Example: ?page=2&limit=5
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            // Get filtering value from URL
            // Example: ?role=admin
            const { role } = req.query;

            // Calculate how many users to skip
            const offset = (page - 1) * limit;

            let result;

            // If role is provided, filter users by role
            if (role) {

                result = await pool.query(
                    `SELECT id, email, role, created_at
                     FROM users
                     WHERE role = $1
                     ORDER BY id
                     LIMIT $2 OFFSET $3`,
                    [role, limit, offset]
                );

            } else {

                // If no role is provided, return all users
                // but still apply pagination
                result = await pool.query(
                    `SELECT id, email, role, created_at
                     FROM users
                     ORDER BY id
                     LIMIT $1 OFFSET $2`,
                    [limit, offset]
                );
            }

            // Send the result
            res.json({
                page: page,
                limit: limit,
                filter: role || "all",
                persons: result.rows
            });

        } catch (error) {

            // Show error in terminal
            console.error(error);

            // Send error response
            res.status(500).json({
                message: "Server error"
            });
        }
    }
);

export default router;