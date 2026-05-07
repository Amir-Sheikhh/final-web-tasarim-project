import express from "express";
import { asyncHandler } from "../lib/http.js";
import { verifyConnection } from "../db/neo4j.js";

const router = express.Router();
const startedAt = Date.now();

router.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const checks = {
      api: {
        ok: true,
        latencyMs: 0
      },
      database: {
        ok: false,
        latencyMs: null
      },
      frontendBackend: {
        ok: true,
        message: "Frontend can verify this endpoint with same-origin fetch."
      }
    };

    const dbStart = process.hrtime.bigint();

    try {
      await verifyConnection();
      checks.database.ok = true;
      checks.database.latencyMs = Math.round((Number(process.hrtime.bigint() - dbStart) / 1_000_000) * 100) / 100;
    } catch (error) {
      checks.database.error = error.message;
    }

    const ok = Object.values(checks).every((check) => check.ok);

    res.status(ok ? 200 : 503).json({
      ok,
      service: "graphlink-social",
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
      checks
    });
  })
);

export default router;
