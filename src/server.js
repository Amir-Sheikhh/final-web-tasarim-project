import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import swaggerUiDist from "swagger-ui-dist";
import { appConfig } from "./config.js";
import { closeDriver, verifyConnection } from "./db/neo4j.js";
import { initializeGraph } from "./db/init.js";
import { logError, logInfo, logWarn } from "./lib/logger.js";
import { requestLogger } from "./middleware/requestLogger.js";
import authRouter from "./routes/auth.js";
import graphRouter from "./routes/graph.js";
import messagingRouter from "./routes/messaging.js";
import monitoringRouter from "./routes/monitoring.js";
import socialRouter from "./routes/social.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");
const docsDir = path.resolve(__dirname, "../docs");
const cytoscapeDir = path.resolve(__dirname, "../node_modules/cytoscape/dist");
const swaggerUiDir = swaggerUiDist.getAbsoluteFSPath();
const app = express();
const seedOnly = process.argv.includes("--seed-only");
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        mediaSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    }
  })
);
app.use(express.json({ limit: "30mb" }));
app.use(cookieParser());
app.use(requestLogger);
app.use(express.static(publicDir));
app.use("/vendor/cytoscape", express.static(cytoscapeDir));
app.use("/docs/assets", express.static(swaggerUiDir));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "graphlink-social"
  });
});

app.use("/api/monitoring", monitoringRouter);
app.get("/openapi.yaml", (_req, res) => {
  res.sendFile(path.join(docsDir, "openapi.yaml"));
});

app.get("/docs", (_req, res) => {
  res.sendFile(path.join(docsDir, "swagger.html"));
});

app.use("/api/auth", authRouter);
app.use("/api/graph", graphRouter);
app.use("/api", messagingRouter);
app.use("/api", socialRouter);

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((error, req, res, _next) => {
  const status =
    error.status ??
    (error.message?.includes("zorunludur") || error.message?.includes("bos olamaz") ? 400 : 500);

  const logMeta = {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    status
  };

  if (status >= 500) {
    logError("request_error", error, logMeta);
  } else {
    logWarn("request_rejected", {
      ...logMeta,
      error: error.message
    });
  }

  res.status(status).json({
    error: error.message || "Beklenmeyen bir hata olustu.",
    requestId: req.requestId
  });
});

async function bootstrap() {
  await verifyConnection();
  await initializeGraph({ autoSeed: appConfig.autoSeed });

  if (seedOnly) {
    console.log("Neo4j demo verisi hazirlandi.");
    await closeDriver();
    process.exit(0);
  }

  app.listen(appConfig.port, () => {
    logInfo("server_started", {
      url: `http://localhost:${appConfig.port}`
    });
  });
}

async function shutdown(signal) {
  logInfo("shutdown_requested", { signal });
  await closeDriver();
  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch(() => process.exit(1));
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch(() => process.exit(1));
});

if (isMainModule) {
  bootstrap().catch(async (error) => {
    logError("server_start_failed", error, {
      hint: "Neo4j calismiyorsa once `npm run neo4j:setup` ve `npm run neo4j:start` komutlarini calistirin."
    });
    await closeDriver();
    process.exit(1);
  });
}

export { app, bootstrap };
