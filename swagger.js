import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "Auth Project API",
            version: "1.0.0",
            description: "Authentication and User Management API"
        },

        servers: [
            {
                url: "http://localhost:3000"
            }
        ],

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            },
            schemas: {
                User: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 1 },
                        email: { type: "string", format: "email", example: "test@gmail.com" },
                        role: { type: "string", example: "user" },
                        created_at: { type: "string", format: "date-time" }
                    }
                },
                Error: {
                    type: "object",
                    properties: {
                        message: { type: "string", example: "Invalid input" }
                    }
                }
            }
        }
    },

    // Files containing Swagger documentation
    apis: [
        "./routes/auth.js",
        "./routes/v1/profile.js",
        "./routes/v1/users.js",
        "./routes/v2/users.js"
    ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;


