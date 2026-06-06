const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const profileRoutes = require("./routes/profileRoutes");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

// Security & logging
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: "Too many requests, please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// Health check
app.get("/health", (req, res) => {
  res.json({ success: true, status: "OK", timestamp: new Date().toISOString() });
});

// API docs summary
app.get("/", (req, res) => {
  res.json({
    success: true,
    name: "GitHub Profile Analyzer API",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      analyze: "POST /api/profiles/analyze/:username",
      list: "GET /api/profiles?page=1&limit=20&sort=profile_score&order=DESC&search=",
      single: "GET /api/profiles/:username",
      delete: "DELETE /api/profiles/:username",
      stats: "GET /api/profiles/stats/summary",
    },
  });
});

// Routes
app.use("/api/profiles", profileRoutes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
