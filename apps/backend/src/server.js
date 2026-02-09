"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const healthRouter = require("./routes/health");
const projectsRouter = require("./routes/projects");
const tasksRouter = require("./routes/tasks");

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.use("/health", healthRouter);
app.use("/api/v1", projectsRouter);
app.use("/api/v1", tasksRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(PORT, () => {
  console.log(`[backend] Listening on port ${PORT}`);
});

function shutdown() {
  server.close(() => {
    console.log("[backend] Shutdown complete");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
