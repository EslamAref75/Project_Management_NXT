"use strict";

const jwt = require("jsonwebtoken");

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  if (!NEXTAUTH_SECRET) {
    console.error("[auth] NEXTAUTH_SECRET not set");
    return res.status(500).json({ error: "Server misconfiguration" });
  }
  try {
    const payload = jwt.verify(token, NEXTAUTH_SECRET);
    req.user = { id: String(payload.id ?? payload.sub), role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = { authMiddleware };
