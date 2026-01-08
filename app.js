const express = require("express");
const cors = require("cors");
const { specs, swaggerUi } = require("./swagger/config");

const app = express();

const PORT = process.env.PORT || 5000;

// CORS Configuration
const getAllowedOrigins = () => {
  const frontendUrl = process.env.FRONTEND_URL;
  const defaultOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost:3000",
  ];

  if (frontendUrl) {
    return [frontendUrl, ...defaultOrigins];
  }
  return defaultOrigins;
};

const ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "x-telegram-id",
  "x-telegram-init-data",
];

app.use(express.json());
app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
    allowedHeaders: ALLOWED_HEADERS,
    optionsSuccessStatus: 200, // Support legacy browsers
  }),
);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/seller", require("./routes/seller"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/transfers", require("./routes/transfers"));
app.use("/api/export", require("./routes/export"));

app.get("/api/health", (req, res) => res.json({ status: "OK" }));

// Swagger Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Telegram Hisobchi Bot API Documentation",
  }),
);

// API Documentation JSON endpoint
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(specs);
});

module.exports = app;
