"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { requestIdMiddleware } = require("./middleware/requestId");
const { requestLogMiddleware } = require("./middleware/requestLog");
const { metricsMiddleware } = require("./middleware/metrics");
const { globalLimiter, apiV1Limiter } = require("./middleware/rateLimit");
const logger = require("./lib/logger");
const { sendError, CODES } = require("./lib/errorResponse");
const healthRouter = require("./routes/health");
const projectsRouter = require("./routes/projects");
const tasksRouter = require("./routes/tasks");

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const BODY_LIMIT = process.env.BODY_LIMIT || "512kb";
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 30000;

// CORS: allowlist from CORS_ORIGINS (comma-separated) or single CORS_ORIGIN
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [process.env.CORS_ORIGIN || "http://localhost:3000"];
const corsOptions = {
  origin: corsOrigins.length === 1 ? corsOrigins[0] : (origin, cb) => {
    if (!origin || corsOrigins.includes(origin)) cb(null, true);
    else cb(null, false);
  },
  credentials: true,
};

// Optional Sentry (init only when SENTRY_DSN is set; requires npm install @sentry/node)
let Sentry;
if (process.env.SENTRY_DSN) {
  try {
    Sentry = require("@sentry/node");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: 0.1,
    });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  } catch (e) {
    logger.warn("Sentry not installed; run npm install @sentry/node to enable", {});
  }
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(requestIdMiddleware);
app.use(requestLogMiddleware);
app.use(cors(corsOptions));
app.use(express.json({ limit: BODY_LIMIT }));
app.use(globalLimiter);

app.use("/health", healthRouter);
app.use(metricsMiddleware);
app.use("/api/v1", apiV1Limiter);
app.use("/api/v1", projectsRouter);
app.use("/api/v1", tasksRouter);

if (process.env.SENTRY_DSN && Sentry) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use((err, req, res, next) => {
  const requestId = req.id || "unknown";
  logger.error("Unhandled error", {
    requestId,
    error: err.message,
    stack: err.stack,
    route: req.originalUrl,
    method: req.method,
  });
  sendError(res, 500, "Internal server error", { code: CODES.INTERNAL_ERROR, requestId });
});

const server = app.listen(PORT, () => {
  logger.info("Backend listening", { port: PORT });
});
server.timeout = REQUEST_TIMEOUT_MS;
server.keepAliveTimeout = REQUEST_TIMEOUT_MS + 1000;
server.headersTimeout = REQUEST_TIMEOUT_MS + 2000;

function shutdown() {
  server.close(() => {
    console.log("[backend] Shutdown complete");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
