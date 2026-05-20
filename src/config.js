import dotenv from "dotenv";
import crypto from "node:crypto";

dotenv.config();

function flag(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export const appConfig = {
  port: Number(process.env.PORT ?? 3000),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT ?? "12mb",
  autoSeed: flag(process.env.AUTO_SEED, true),
  demoPassword: process.env.DEMO_PASSWORD ?? "demo12345",
  neo4j: {
    uri: process.env.NEO4J_URI ?? "bolt://127.0.0.1:7687",
    username: process.env.NEO4J_USERNAME ?? "neo4j",
    password: process.env.NEO4J_PASSWORD ?? "neo4j",
    database: process.env.NEO4J_DATABASE ?? "neo4j",
    authDisabled: flag(process.env.NEO4J_AUTH_DISABLED, true)
  },
  jwt: {
    secret:
      process.env.JWT_SECRET ??
      crypto.createHash("sha256").update(`${process.cwd()}-graphlink`).digest("hex"),
    accessTokenTtl: process.env.JWT_ACCESS_TTL ?? "15m",
    accessCookieMinutes: Number(process.env.JWT_ACCESS_COOKIE_MINUTES ?? 15),
    refreshDays: Number(process.env.JWT_REFRESH_DAYS ?? 7),
    cookieSecure: flag(process.env.COOKIE_SECURE, false)
  },
  rateLimit: {
    authWindowMs: 60 * 1000,
    authMax: 8,
    readWindowMs: 60 * 1000,
    readMax: 120,
    writeWindowMs: 60 * 1000,
    writeMax: 40
  }
};
