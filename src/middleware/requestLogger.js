import crypto from "node:crypto";
import { logInfo, logWarn } from "../lib/logger.js";

export function requestLogger(req, res, next) {
  const requestId = crypto.randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const payload = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100
    };

    if (res.statusCode >= 500) {
      logWarn("request_failed", payload);
      return;
    }

    logInfo("request_completed", payload);
  });

  next();
}
