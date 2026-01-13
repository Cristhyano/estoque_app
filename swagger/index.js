const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

function setupSwagger(app) {
  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Estoque API",
        version: "1.0.0",
      },
      servers: [{ url: "http://localhost:3001" }],
    },
    apis: [
      path.join(__dirname, "docs.js"),
      path.join(__dirname, "..", "routes", "*.js"),
    ],
  });

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = { setupSwagger };
