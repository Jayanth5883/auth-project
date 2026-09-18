# Authentication API Learning Notes

## 1. Node.js, npm, and ES modules - `package.json`
- The project runs on Node.js and starts with `npm start`.
- `"type": "module"` enables `import` and `export` syntax.
- Dependencies include Express, PostgreSQL, bcrypt, JWT, cookies, and dotenv.

## 2. Express server and routing - `server.js`
- Creates an Express application and listens on `PORT` or `3000`.
- `express.json()` reads JSON request bodies.
- `cookieParser()` reads cookies sent by clients.
- Mounts authentication at `/auth`.
- Mounts versioned user APIs at `/api/v1/users` and `/api/v2/users`.
- Mounts protected profiles at `/api/v1/profile`.
- Provides `GET /` as a health-check route.
- Middleware order matters: parsing, cookies, routes, then error handling.

## 3. Environment variables and secrets - `server.js`, `db.js`
- `dotenv.config()` loads values from `.env`.
- `PORT`, `DATABASE_URL`, `ACCESS_TOKEN_SECRET`, and `REFRESH_TOKEN_SECRET` belong in environment variables.
- Secrets must not be hard-coded or committed to source control.

## 4. PostgreSQL and SQL queries - `db.js`, `routes/auth.js`, `routes/v1/users.js`
- `pg.Pool` manages reusable database connections.
- Routes use `pool.query()` to read and write users.
- Parameterized values such as `$1`, `$2`, and `$3` help prevent SQL injection.
- User data includes `id`, `email`, `password`, `role`, and `created_at`.
- SQL supports lookup, insert, filtering, ordering, `LIMIT`, and `OFFSET`.

## 5. Registration validation - `routes/auth.js`
- `email` and `password` are required.
- Email is trimmed and converted to lowercase.
- Email must contain a valid basic format with `@`.
- Password must contain at least 8 characters.
- Invalid input returns HTTP `400`.
- Duplicate email returns HTTP `409`.

## 6. Password security - `routes/auth.js`
- bcrypt hashes passwords before they are stored.
- The plain-text password is never inserted into the database.
- Login uses `bcrypt.compare()` against the stored hash.
- Incorrect credentials return a generic HTTP `401` response.

## 7. Login and JWT tokens - `routes/auth.js`
- Login finds the user by email after validating the request.
- The access token contains the user ID, email, and role.
- Access tokens expire after `15m`.
- Refresh tokens contain the user ID and expire after `7d`.
- JWT signing and verification use separate environment secrets.

## 8. Cookies and refresh flow - `routes/auth.js`, `server.js`
- The refresh token is stored in an HTTP-only `refreshToken` cookie.
- `sameSite: "strict"` helps reduce CSRF risk.
- The cookie lasts seven days; `secure` should be enabled with HTTPS in production.
- `POST /auth/refresh` verifies the cookie and returns a new access token.
- `POST /auth/logout` clears the refresh-token cookie.

## 9. Authentication middleware - `middleware/authMiddleware.js`
- Reads the `Authorization` header in `Bearer <token>` format.
- Rejects missing or incorrectly formatted headers with HTTP `401`.
- Verifies the access token with `ACCESS_TOKEN_SECRET`.
- Stores decoded identity data in `req.user` for later handlers.
- Rejects invalid or expired tokens with HTTP `401`.

## 10. Authorization and RBAC - `middleware/authorizeRole.js`, `routes/auth.js`
- Authentication identifies the user; authorization checks permissions.
- `authorizeRole(requiredRole)` compares `req.user.role` with the required role.
- A role mismatch returns HTTP `403`.
- `GET /auth/admin` requires authentication and the `admin` role.
- Admin-only user listing routes use the same middleware combination.

## 11. Protected profiles and IDOR prevention - `routes/auth.js`, `routes/v1/profile.js`
- `GET /auth/profile` loads the authenticated user from `req.user.id`.
- `GET /api/v1/profile/:id` validates the requested numeric ID.
- Normal users may access only their own profile.
- Admins may access another user’s profile.
- Unauthorized access returns HTTP `403`; missing users return HTTP `404`.

## 12. API versioning, pagination, and filtering - `routes/v1/users.js`, `routes/v2/users.js`
- Both user-list routes require a valid token and the `admin` role.
- `page` and `limit` calculate an SQL offset for pagination.
- Optional `role` filters users by role with a parameterized query.
- V1 returns `page`, `limit`, `filter`, and `persons`.
- V2 returns `version`, `currentPage`, `usersPerPage`, `roleFilter`, and `data`.
- Separate `/api/v1` and `/api/v2` contracts allow future API changes.

## 13. Error handling and HTTP status codes - `middleware/errorHandler.js`, route files
- Central error middleware logs detailed errors on the server.
- Clients receive a generic HTTP `500` message instead of internal details.
- Routes use `400` for invalid input, `401` for authentication failures, `403` for forbidden access, `404` for missing users, and `409` for duplicates.
- `next(error)` is used by protected routes intended to forward unexpected failures.





1. created redis cloud database 
2. added db details to the .env
3. ioredis is a Node.js library used to connect your Node.js application to Redis.
---in redis.js created the redis connection
4. npm install bullmq from that import queue
5. email queue is created by connecting to the redis connection
6. Import worker from bullmq
7. background worker is created to the email queue


8. connected registration to the queue
await emailQueue.add("welcomeEmail", {
    email: email,
});

9. added 3 job attemts
defaultJobOptions: {
    attempts: 3,

    backoff: {
        type: "fixed",
        delay: 2000,
    },

    removeOnComplete: true,
    removeOnFail: false,
}


                    AUTH PROJECT

                  User Registration
                         │
                         ▼
                  Express / Auth
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
        PostgreSQL              BullMQ Queue
        User data               emailQueue
                                     │
                                     ▼
                                Redis Cloud
                                     │
                                     ▼
                                Email Worker
                                     │
                                     ▼
                              Background Job
                                     │
                              ┌──────┴──────┐
                              │             │
                           Success       Failure
                              │             │
                              ▼             ▼
                       Remove job       Retry × 3



