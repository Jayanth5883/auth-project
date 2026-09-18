// 11. Advanced REST APIs: This version supports pagination and role filtering.
// 12. API versioning: The route is mounted under /api/v2/users and can evolve independently.

import express from "express";
import pool from "../../db.js";
import authenticateJWT from "../../middleware/authMiddleware.js";
import authorizeRole from "../../middleware/authorizeRole.js";

const router = express.Router();

/**
 * @swagger
 * /api/v2/users:
 *   get:
 *     summary: List users with the version 2 response format
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 5
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           example: admin
 *         description: Optional role filter
 *     responses:
 *       200:
 *         description: Paginated user list in the version 2 format
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Access denied for non-admin users
 */

router.get(
    "/",
    authenticateJWT,
    authorizeRole("admin"),
    async (req, res) => {

        try {
            // 11. Pagination: page and limit select a bounded slice of users.
            // Get pagination values from the URL
            // Example: ?page=1&limit=5
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 5;

            // 11. Filtering: the optional role query parameter narrows the results.
            // Get role filter from the URL
            // Example: ?role=admin
            const { role } = req.query;

            // Calculate how many records to skip
            const offset = (page - 1) * limit;

            let result;

            // If role is provided, filter by role
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

                // If no role is provided,
                // return all users with pagination
                result = await pool.query(
                    `SELECT id, email, role, created_at
                     FROM users
                     ORDER BY id
                     LIMIT $1 OFFSET $2`,
                    [limit, offset]
                );
            }

            // V2 response format
            // We are using different property names
            // to demonstrate that V2 can evolve independently.
            res.json({
                version: "v2",
                currentPage: page,
                usersPerPage: limit,
                roleFilter: role || "all",
                data: result.rows
            });

        } catch (error) {

            // 14. Error handling: Log the unexpected error and return a generic response.
            // Show error in terminal
            console.error(error);

            res.status(500).json({
                message: "Server error"
            });
        }
    }
);

export default router;