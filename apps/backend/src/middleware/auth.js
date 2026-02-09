"use strict";

const jwt = require("jsonwebtoken");
const { sendError, CODES } = require("../lib/errorResponse");

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

function authMiddleware(req, res, next) {
  const requestId = req.id || undefined;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, 401, "Unauthorized", { code: CODES.UNAUTHORIZED, requestId });
  }
  const token = authHeader.slice(7);
  if (!NEXTAUTH_SECRET) {
    console.error("[auth] NEXTAUTH_SECRET not set");
    return sendError(res, 500, "Server misconfiguration", { code: CODES.SERVER_ERROR, requestId });
  }
  try {
    const payload = jwt.verify(token, NEXTAUTH_SECRET);
    req.user = { id: String(payload.id ?? payload.sub), role: payload.role };
    next();
  } catch (err) {
    return sendError(res, 401, "Unauthorized", { code: CODES.UNAUTHORIZED, requestId });
  }
}

module.exports = { authMiddleware };
