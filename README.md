# Authentication API Learning Roadmap

This project is a Node.js authentication and authorization backend built with Express.js, PostgreSQL, JWTs, cookies, and role-based access control.

The roadmap below uses the project's real files and folders as its index. Each section explains the backend concepts demonstrated by that file.

## Project Structure

```text
auth-project/
|-- server.js
|-- db.js
|-- package.json
|-- package-lock.json
|-- .env
|-- .env.example
|-- .gitignore
|-- middleware/
|   |-- authMiddleware.js
|   |-- authorizeRole.js
|   `-- errorHandler.js
`-- routes/
    |-- auth.js
    |-- v1/
    |   |-- users.js
    |   `-- profile.js
    `-- v2/
        `-- users.js
```

## package.json

### Node.js and ES modules

- The application runs on the Node.js runtime.
- `"type": "module"` enables ES module syntax with `import` and `export`.
- The project starts with `npm start`, which runs `node server.js`.

### Backend technologies

- `express`: HTTP server, routers, REST endpoints, and middleware.
- `pg`: PostgreSQL driver and connection pooling.
- `bcrypt`: Password hashing and password comparison.
- `jsonwebtoken`: Signing and verifying access and refresh JWTs.
- `cookie-parser`: Reading cookies from incoming requests.
- `dotenv`: Loading environment variables from `.env`.

## server.js

`server.js` is the application entry point and Express application composition root.

### Express.js

- Creates the Express application with `express()`.
- Starts the server with `app.listen()`.
- Uses `express.json()` to parse JSON request bodies.

### REST API routing

The application exposes HTTP routes through routers:

- `/auth` maps to `routes/auth.js`.
- `/api/v1/users` maps to `routes/v1/users.js`.
- `/api/v2/users` maps to `routes/v2/users.js`.
- `/api/v1/profile` maps to `routes/v1/profile.js`.
- `GET /` is a basic server health response.

### Middleware order

- JSON parsing runs before routes.
- `cookieParser()` makes request cookies available through `req.cookies`.
- Route handlers run after the global middleware.
- `errorHandler` is registered after the routes so forwarded errors reach the central handler.

### Environment configuration

`dotenv.config()` loads the port, database URL, and JWT secrets from environment variables instead of source code.

## db.js

### PostgreSQL

- Imports the `pg` package.
- Creates a PostgreSQL `Pool`.
- Uses `process.env.DATABASE_URL` for the connection string.
- Exports the pool so route modules can execute parameterized SQL queries.

### Database access concepts

- Connection pooling reuses database connections.
- `pool.query()` executes SQL from route handlers.
- `$1`, `$2`, and `$3` placeholders with value arrays provide parameterized queries and reduce SQL injection risk.
- The project expects a `users` table with fields used by the routes: `id`, `email`, `password`, `role`, and `created_at`.

The database schema or migration files are not included in the current project.

## middleware/authMiddleware.js

### Authentication middleware

`authenticateJWT` protects routes that require a signed-in user.

- Reads the `Authorization` request header.
- Expects the format `Bearer <access-token>`.
- Rejects a missing header with HTTP `401`.
- Rejects an invalid header format with HTTP `401`.
- Verifies the token with `ACCESS_TOKEN_SECRET`.
- Places the decoded JWT payload in `req.user`.
- Calls `next()` only after successful verification.
- Rejects invalid or expired access tokens with HTTP `401`.

### JWT access-token payload

The login route places `id`, `email`, and `role` in the access token. Protected routes use these values to identify the authenticated user and authorize access.

## middleware/authorizeRole.js

### Authorization and RBAC

`authorizeRole(requiredRole)` is role-based access control middleware.

- Reads the authenticated user's role from `req.user.role`.
- Compares it with the required role.
- Allows the request to continue when the roles match.
- Returns HTTP `403` when the user does not have the required role.
- The current admin-only routes use `authorizeRole("admin")`.

Authentication answers “Who is the user?” Authorization and RBAC answer “Is this user allowed to perform this action?”

## middleware/errorHandler.js

### Centralized error handling

`errorHandler` is the final Express error-handling middleware.

- Receives errors forwarded with `next(error)`.
- Logs the detailed error on the server.
- Returns a generic `500` JSON response to the client.
- Avoids exposing internal database or implementation details in the public response.

Some route handlers still handle errors locally with their own `500` response, while the version 1 users route forwards errors to this central handler.

## routes/auth.js

This router contains registration, login, token refresh, logout, profile, and admin authorization flows.

### POST /auth/register

Registration demonstrates:

- Reading `email` and `password` from `req.body`.
- Required-field validation.
- Email trimming and lowercasing.
- Basic email-format validation.
- Minimum password length validation of eight characters.
- Duplicate-user checking with PostgreSQL.
- Bcrypt password hashing with `bcrypt.hash(password, 10)`.
- Storing the hashed password rather than the plain password.
- Returning a `201` response with the created user's public fields.
- Returning `400`, `409`, or `500` responses for invalid input, duplicate users, or server errors.

### POST /auth/login

Login demonstrates:

- Required-field validation.
- Finding a user by email.
- Comparing the submitted password with the stored bcrypt hash using `bcrypt.compare()`.
- Returning a generic `401` message for an unknown user or incorrect password.
- Creating a short-lived access token with a `15m` lifetime.
- Creating a refresh token with a `7d` lifetime.
- Including user identity and role in the access token.
- Returning the access token in the JSON response.
- Storing the refresh token in an HTTP-only cookie.

### GET /auth/profile

This protected endpoint demonstrates:

- `authenticateJWT` as route middleware.
- Reading the authenticated user's ID from `req.user`.
- Loading the current user's profile from PostgreSQL.
- Returning `404` when the user no longer exists.

### POST /auth/refresh

The refresh-token flow demonstrates:

- Reading `req.cookies.refreshToken`.
- Rejecting a missing refresh token with `401`.
- Verifying the refresh token with `REFRESH_TOKEN_SECRET`.
- Creating a new short-lived access token with `ACCESS_TOKEN_SECRET`.
- Returning `401` for an invalid or expired refresh token.

### POST /auth/logout

- Clears the `refreshToken` cookie.
- Returns a logout confirmation response.

### GET /auth/admin

This route demonstrates middleware composition:

```js
authenticateJWT
authorizeRole("admin")
```

The request must first have a valid access token, then the authenticated user must have the `admin` role.

## routes/v1/users.js

### GET /api/v1/users

This is an admin-protected user listing endpoint.

- Uses JWT authentication and admin RBAC.
- Reads `page` and `limit` query parameters.
- Defaults to page `1` and limit `10`.
- Calculates an SQL `OFFSET` from the page and limit.
- Supports filtering with `?role=admin`.
- Uses SQL `LIMIT` and `OFFSET` for pagination.
- Uses parameterized values for the role, limit, and offset.
- Returns the page, limit, filter, and user rows in the v1 response format.
- Forwards unexpected errors to the central error handler with `next(error)`.

Example:

```text
GET /api/v1/users?page=2&limit=5&role=admin
Authorization: Bearer <access-token>
```

## routes/v1/profile.js

### GET /api/v1/profile/:id

This route demonstrates protected resource access and IDOR prevention.

- Requires a valid access token.
- Reads the target user ID from `req.params.id`.
- Converts and validates the route parameter as an integer.
- Reads the logged-in user's ID from the verified JWT.
- Allows a normal user to access only their own profile.
- Allows an admin to access another user's profile.
- Returns `403` when a user attempts to access another user's profile.
- Uses a parameterized `WHERE id = $1` query.
- Returns `404` when the requested user does not exist.
- Forwards unexpected errors to the central error handler.

This comparison between the requested object ID and the authenticated user's ID is the project's IDOR protection.

## routes/v2/users.js

### GET /api/v2/users

This endpoint repeats the protected, paginated, role-filtered user listing while demonstrating API versioning.

- Uses JWT authentication and admin RBAC.
- Supports `page`, `limit`, and `role` query parameters.
- Uses SQL `LIMIT` and `OFFSET`.
- Returns a changed v2 response shape:

```json
{
	"version": "v2",
	"currentPage": 1,
	"usersPerPage": 10,
	"roleFilter": "all",
	"data": []
}
```

The separate `/api/v1` and `/api/v2` prefixes allow response contracts to evolve without immediately breaking existing clients.

## .env.example

This file documents the required environment variables without containing real credentials:

- `PORT`: HTTP server port.
- `DATABASE_URL`: PostgreSQL connection string.
- `ACCESS_TOKEN_SECRET`: Secret used to sign and verify access tokens.
- `REFRESH_TOKEN_SECRET`: Secret used to sign and verify refresh tokens.

### Secrets management

- Keep real values in `.env`.
- Do not commit `.env` to source control.
- Use different strong secrets for access and refresh tokens.
- Do not hard-code credentials or JWT secrets in JavaScript files.

## .gitignore

The repository ignores:

- `.env` environment secrets.
- `node_modules/` installed dependencies.
- `*.log` debug and log files.

## Request and authentication flow

```text
Client
	│
	├── POST /auth/register
	│     └── validate input → bcrypt hash → PostgreSQL
	│
	├── POST /auth/login
	│     └── verify password → create access JWT + refresh JWT cookie
	│
	├── Protected request
	│     └── Authorization: Bearer access-token
	│           → authenticateJWT → authorizeRole when required → route handler
	│
	└── POST /auth/refresh
				└── read refresh cookie → verify refresh JWT → return new access JWT
```

## Running the project

### Install dependencies

```bash
npm install
```

### Configure environment variables

Create `.env` using `.env.example` as a template and provide a working PostgreSQL connection string plus JWT secrets.

### Start the server

```bash
npm start
```

The default server URL is `http://localhost:3000`.

## Concepts covered

- Node.js runtime and npm project setup.
- ES modules.
- Express.js application setup and routing.
- REST API design with HTTP methods and status codes.
- Express middleware and middleware order.
- PostgreSQL connection pooling and parameterized SQL.
- Environment configuration and secrets management.
- Password hashing with bcrypt.
- JWT signing and verification.
- Short-lived access tokens and longer-lived refresh tokens.
- HTTP-only, same-site refresh-token cookies.
- Authentication with Bearer tokens.
- Authorization with role-based access control.
- Input validation and normalized user data.
- Centralized and route-level error handling.
- IDOR prevention for user profiles.
- API versioning with `/api/v1` and `/api/v2`.
- Pagination with page, limit, and offset.
- Query filtering by user role.
