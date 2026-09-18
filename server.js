// Import Express
import express from "express";

// Import dotenv
import dotenv from "dotenv";

// Import cookie-parser
import cookieParser from "cookie-parser";

// Import Swagger
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.js";

// Import routes
import authRoutes from "./routes/auth.js";
import userRoutesV1 from "./routes/v1/users.js";
import userRoutesV2 from "./routes/v2/users.js";
import profileRoutes from "./routes/v1/profile.js";

// Import error handler
import errorHandler from "./middleware/errorHandler.js";

// Load environment variables
dotenv.config();

// Create Express application
const app = express();

// Get port
const PORT = process.env.PORT || 3000;


// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

app.use(express.json());

app.use(cookieParser());


// --------------------------------------------------
// SWAGGER DOCUMENTATION
// --------------------------------------------------

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// --------------------------------------------------
// ROUTES
// --------------------------------------------------

app.use("/auth", authRoutes);

app.use("/api/v1/users", userRoutesV1);

app.use("/api/v2/users", userRoutesV2);

app.use("/api/v1/profile", profileRoutes);


// --------------------------------------------------
// TEST ROUTE
// --------------------------------------------------

app.get("/", (req, res) => {
    res.send("Authentication server is running");
});


// --------------------------------------------------
// ERROR HANDLER
// --------------------------------------------------

app.use(errorHandler);


// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});