# Code Review Bundle

This generated bundle concatenates the key source, test, CI, and config files so reviewers can inspect the project from a single Markdown file.

## src/server.js

```js
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
        scriptSrc: ["'self'"],
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
app.use(express.json({ limit: appConfig.jsonBodyLimit }));
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
      hint: "Neo4j calismiyorsa cross-platform Docker akisi icin `npm run neo4j:setup` ve `npm run neo4j:start` komutlarini calistirin."
    });
    await closeDriver();
    process.exit(1);
  });
}

export { app, bootstrap };
```

## src/config.js

```js
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
```

## src/lib/security.js

```js
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { appConfig } from "../config.js";

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function generateOpaqueToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    appConfig.jwt.secret,
    {
      expiresIn: appConfig.jwt.accessTokenTtl
    }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, appConfig.jwt.secret);
}

export function accessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: appConfig.jwt.cookieSecure,
    path: "/",
    maxAge: appConfig.jwt.accessCookieMinutes * 60 * 1000
  };
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: appConfig.jwt.cookieSecure,
    path: "/",
    maxAge: appConfig.jwt.refreshDays * 24 * 60 * 60 * 1000
  };
}

export function clearCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: appConfig.jwt.cookieSecure,
    path: "/"
  };
}
```

## src/lib/uploads.js

```js
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppError } from "./http.js";
import { logWarn } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../../public/uploads");

export const postMediaTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv"
};

export const profileImageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

function normalizeText(value) {
  return String(value ?? "").trim();
}

function sanitizeFileName(value) {
  const baseName = path.basename(normalizeText(value) || "upload");
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180) || "upload";
}

function parseUpload(upload, { allowedTypes, maxBytes, emptyMessage, tooLargeMessage }) {
  if (!upload) {
    return null;
  }

  const match = /^data:([^;]+);base64,([a-zA-Z0-9+/=]+)$/.exec(upload.dataUrl ?? "");

  if (!match) {
    throw new AppError(emptyMessage, 400);
  }

  const [, dataMime, base64] = match;

  if (dataMime !== upload.type || !allowedTypes[upload.type]) {
    throw new AppError("Desteklenmeyen medya turu.", 400);
  }

  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length) {
    throw new AppError(emptyMessage, 400);
  }

  if (buffer.length > maxBytes) {
    throw new AppError(tooLargeMessage, 413);
  }

  return {
    buffer,
    mime: upload.type,
    originalName: sanitizeFileName(upload.name),
    extension: allowedTypes[upload.type]
  };
}

async function saveUpload(upload, options) {
  const parsed = parseUpload(upload, options);

  if (!parsed) {
    return null;
  }

  await fs.mkdir(uploadDir, { recursive: true });
  const fileName = `${options.prefix}-${Date.now()}-${crypto.randomUUID()}.${parsed.extension}`;
  const absolutePath = path.join(uploadDir, fileName);
  await fs.writeFile(absolutePath, parsed.buffer, { flag: "wx" });

  return {
    url: `/uploads/${fileName}`,
    mime: parsed.mime,
    name: parsed.originalName,
    path: absolutePath
  };
}

export async function savePostMedia(upload) {
  const saved = await saveUpload(upload, {
    prefix: "post",
    allowedTypes: postMediaTypes,
    maxBytes: 8 * 1024 * 1024,
    emptyMessage: "Medya dosyasi bos olamaz.",
    tooLargeMessage: "Medya dosyasi en fazla 8 MB olabilir."
  });

  if (!saved) {
    return null;
  }

  return {
    ...saved,
    type: saved.mime.startsWith("image/") ? "image" : "video"
  };
}

export async function saveProfileImage(upload) {
  const saved = await saveUpload(upload, {
    prefix: "profile",
    allowedTypes: profileImageTypes,
    maxBytes: 5 * 1024 * 1024,
    emptyMessage: "Profil fotografi bos olamaz.",
    tooLargeMessage: "Profil fotografi en fazla 5 MB olabilir."
  });

  if (!saved) {
    return null;
  }

  return {
    ...saved,
    type: "image"
  };
}

export async function removeSavedUpload(upload) {
  if (!upload?.path) {
    return;
  }

  try {
    await fs.unlink(upload.path);
  } catch (error) {
    logWarn("upload_cleanup_failed", {
      path: upload.path,
      error: error.message
    });
  }
}

export async function removeUploadByUrl(url) {
  if (!url?.startsWith("/uploads/")) {
    return;
  }

  const targetPath = path.join(uploadDir, path.basename(url));

  try {
    await fs.unlink(targetPath);
  } catch (error) {
    logWarn("upload_cleanup_failed", {
      path: targetPath,
      error: error.message
    });
  }
}
```

## src/middleware/auth.js

```js
import { AppError } from "../lib/http.js";
import { verifyAccessToken } from "../lib/security.js";

function readAccessToken(req) {
  const header = req.headers.authorization;

  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }

  return req.cookies?.access_token ?? null;
}

export function optionalAuth(req, _res, next) {
  const token = readAccessToken(req);

  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role
    };
    return next();
  } catch (_error) {
    return next();
  }
}

export function requireAuth(req, _res, next) {
  const token = readAccessToken(req);

  if (!token) {
    return next(new AppError("Oturum bulunamadi.", 401));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role
    };
    return next();
  } catch (_error) {
    return next(new AppError("Gecersiz veya suresi dolmus oturum.", 401));
  }
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (req.user?.role !== role) {
      return next(new AppError("Bu islem icin yetkiniz yok.", 403));
    }

    return next();
  };
}
```

## src/validation/schemas.js

```js
import { z } from "zod";

const requiredText = (label, min = 1, max = 120) =>
  z
    .string()
    .trim()
    .min(min, `${label} zorunludur.`)
    .max(max, `${label} en fazla ${max} karakter olabilir.`);

const allowedMediaTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/ogg"];
const allowedProfileImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const mediaSchema = z.object({
  dataUrl: z.string().trim().min(1, "Medya dosyasi okunamadi.").max(11_500_000, "Medya dosyasi cok buyuk."),
  name: z.string().trim().max(180, "Dosya adi en fazla 180 karakter olabilir.").optional().default("upload"),
  type: z.enum(allowedMediaTypes, {
    message: "Sadece JPG, PNG, WEBP, GIF, MP4, WEBM veya OGG yukleyebilirsiniz."
  })
});

const profileImageSchema = z.object({
  dataUrl: z.string().trim().min(1, "Profil fotografi okunamadi.").max(8_000_000, "Profil fotografi cok buyuk."),
  name: z.string().trim().max(180, "Dosya adi en fazla 180 karakter olabilir.").optional().default("profile"),
  type: z.enum(allowedProfileImageTypes, {
    message: "Profil fotografi icin sadece JPG, PNG, WEBP veya GIF yukleyebilirsiniz."
  })
});

export const registerSchema = z.object({
  name: requiredText("Ad soyad", 2, 80),
  email: z
    .string()
    .trim()
    .email("Gecerli bir e-posta giriniz.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Sifre en az 8 karakter olmalidir.").max(128, "Sifre cok uzun."),
  headline: requiredText("Baslik", 2, 90),
  city: z.string().trim().max(80, "Sehir en fazla 80 karakter olabilir.").optional().default("Unknown"),
  bio: z.string().trim().max(240, "Bio en fazla 240 karakter olabilir.").optional().default("Yeni kullanici."),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Gecerli bir renk seciniz.")
    .optional()
    .default("#0f766e"),
  profileImage: profileImageSchema.optional().nullable().default(null)
});

export const profileUpdateSchema = z.object({
  name: requiredText("Ad soyad", 2, 80).optional(),
  headline: requiredText("Baslik", 2, 90).optional(),
  city: z.string().trim().max(80, "Sehir en fazla 80 karakter olabilir.").optional(),
  bio: z.string().trim().max(240, "Bio en fazla 240 karakter olabilir.").optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Gecerli bir renk seciniz.")
    .optional(),
  profileImage: profileImageSchema.optional().nullable().default(null),
  removeProfileImage: z.boolean().optional().default(false)
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Gecerli bir e-posta giriniz.")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(1, "Sifre zorunludur.")
    .min(8, "Sifre en az 8 karakter olmalidir.")
    .max(128, "Sifre cok uzun.")
});

export const postSchema = z.object({
  content: z
    .string()
    .trim()
    .max(500, "Paylasim metni en fazla 500 karakter olabilir.")
    .optional()
    .default(""),
  media: mediaSchema.optional().nullable().default(null)
}).superRefine((payload, context) => {
  if (!payload.content && !payload.media) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Paylasim icin metin, fotograf veya video ekleyin.",
      path: ["content"]
    });
  }

  if (payload.content && payload.content.length < 2) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Paylasim metni en az 2 karakter olmalidir.",
      path: ["content"]
    });
  }
});

export const postUpdateSchema = z.object({
  content: z
    .string()
    .trim()
    .max(500, "Paylasim metni en fazla 500 karakter olabilir.")
    .optional()
    .default(""),
  media: mediaSchema.optional().nullable().default(null),
  removeMedia: z.boolean().optional().default(false)
}).superRefine((payload, context) => {
  if (payload.content && payload.content.length < 2) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Paylasim metni en az 2 karakter olmalidir.",
      path: ["content"]
    });
  }
});

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(2, "Yorum metni en az 2 karakter olmalidir.")
    .max(280, "Yorum metni en fazla 280 karakter olabilir.")
});

export const followSchema = z.object({
  targetId: requiredText("Hedef kullanici", 1, 120).optional()
}).superRefine((payload, context) => {
  if (!payload.targetId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Hedef kullanici zorunludur.",
      path: ["targetId"]
    });
  }
});

export const targetQuerySchema = z.object({
  targetId: requiredText("Hedef kullanici", 1, 120)
});

export const optionalTargetQuerySchema = z.object({
  targetId: z.string().trim().optional()
});

export const idParamSchema = z.object({
  userId: requiredText("Kullanici", 1, 120)
});

export const postIdParamSchema = z.object({
  postId: requiredText("Gonderi", 1, 120)
});

export const commentParamSchema = z.object({
  postId: requiredText("Gonderi", 1, 120),
  commentId: requiredText("Yorum", 1, 120)
});

export const notificationParamSchema = z.object({
  notificationId: requiredText("Bildirim", 1, 220)
});

export const messageSearchQuerySchema = z.object({
  search: z.string().trim().max(120, "Arama metni en fazla 120 karakter olabilir.").optional().default("")
});

export const paginationSchema = z.object({
  limit: z.coerce
    .number()
    .int("limit tam sayi olmalidir.")
    .min(1, "limit en az 1 olmalidir.")
    .max(100, "limit en fazla 100 olabilir.")
    .optional()
    .default(20),
  offset: z.coerce
    .number()
    .int("offset tam sayi olmalidir.")
    .min(0, "offset negatif olamaz.")
    .optional()
    .default(0)
});

export const messageSchema = z.object({
  recipientId: requiredText("Alici", 1, 120),
  content: z
    .string()
    .trim()
    .min(1, "Mesaj metni bos olamaz.")
    .max(1000, "Mesaj en fazla 1000 karakter olabilir.")
});
```

## src/services/authService.js

```js
import { appConfig } from "../config.js";
import { createId, getDemoAccounts } from "../db/init.js";
import { runRead, runWrite } from "../db/query.js";
import { AppError } from "../lib/http.js";
import { removeSavedUpload, removeUploadByUrl, saveProfileImage } from "../lib/uploads.js";
import {
  accessCookieOptions,
  clearCookieOptions,
  comparePassword,
  generateOpaqueToken,
  hashPassword,
  hashToken,
  normalizeEmail,
  refreshCookieOptions,
  signAccessToken
} from "../lib/security.js";

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    headline: user.headline,
    city: user.city,
    bio: user.bio,
    color: user.color,
    profileImageUrl: user.profileImageUrl ?? null,
    profileImageMime: user.profileImageMime ?? null,
    profileImageName: user.profileImageName ?? null,
    createdAt: user.createdAt
  };
}

async function findUserByEmail(email) {
  const result = await runRead(
    `
      MATCH (user:User {email: $email})
      RETURN user { .* } AS user
      LIMIT 1
    `,
    { email }
  );

  return result.records[0]?.get("user") ?? null;
}

export async function getCurrentUser(userId) {
  const result = await runRead(
    `
      MATCH (user:User {id: $userId})
      RETURN user {
        .id,
        .name,
        .email,
        .role,
        .headline,
        .city,
        .bio,
        .color,
        .profileImageUrl,
        .profileImageMime,
        .profileImageName,
        .createdAt
      } AS user
      LIMIT 1
    `,
    { userId }
  );

  return result.records[0]?.get("user") ?? null;
}

async function createRefreshSession(user, meta = {}) {
  const refreshToken = generateOpaqueToken();
  const tokenHash = hashToken(refreshToken);
  const session = {
    id: createId("session"),
    tokenHash,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + appConfig.jwt.refreshDays * 24 * 60 * 60 * 1000).toISOString(),
    userAgent: meta.userAgent || "Unknown",
    ipAddress: meta.ipAddress || "Unknown"
  };

  await runWrite(
    `
      MATCH (user:User {id: $userId})
      CREATE (session:Session {
        id: $session.id,
        tokenHash: $session.tokenHash,
        createdAt: $session.createdAt,
        expiresAt: $session.expiresAt,
        userAgent: $session.userAgent,
        ipAddress: $session.ipAddress
      })
      CREATE (user)-[:HAS_SESSION]->(session)
    `,
    {
      userId: user.id,
      session
    }
  );

  return {
    accessToken: signAccessToken(user),
    refreshToken
  };
}

export function applyAuthCookies(res, tokens) {
  res.cookie("access_token", tokens.accessToken, accessCookieOptions());
  res.cookie("refresh_token", tokens.refreshToken, refreshCookieOptions());
}

export function clearAuthCookies(res) {
  res.clearCookie("access_token", clearCookieOptions());
  res.clearCookie("refresh_token", clearCookieOptions());
}

export async function registerUser(payload, meta = {}) {
  const email = normalizeEmail(payload.email);
  const existing = await findUserByEmail(email);

  if (existing) {
    throw new AppError("Bu e-posta zaten kullaniliyor.", 409);
  }

  const user = {
    id: createId("user"),
    name: payload.name,
    email,
    role: "member",
    headline: payload.headline,
    city: payload.city || "Unknown",
    bio: payload.bio || "Yeni kullanici.",
    color: payload.color || "#0f766e",
    profileImageUrl: null,
    profileImageMime: null,
    profileImageName: null,
    createdAt: new Date().toISOString(),
    passwordHash: await hashPassword(payload.password)
  };
  const profileImage = await saveProfileImage(payload.profileImage);

  if (profileImage) {
    user.profileImageUrl = profileImage.url;
    user.profileImageMime = profileImage.mime;
    user.profileImageName = profileImage.name;
  }

  try {
    await runWrite(
      `
        CREATE (user:User {
          id: $user.id,
          name: $user.name,
          email: $user.email,
          role: $user.role,
          headline: $user.headline,
          city: $user.city,
          bio: $user.bio,
          color: $user.color,
          createdAt: $user.createdAt,
          passwordHash: $user.passwordHash
        })
        FOREACH (_ IN CASE WHEN $user.profileImageUrl IS NULL THEN [] ELSE [1] END |
          SET user.profileImageUrl = $user.profileImageUrl,
              user.profileImageMime = $user.profileImageMime,
              user.profileImageName = $user.profileImageName
        )
      `,
      { user }
    );
  } catch (error) {
    await removeSavedUpload(profileImage);
    throw error;
  }

  const tokens = await createRefreshSession(user, meta);

  return {
    user: sanitizeUser(user),
    tokens
  };
}

export async function loginUser(email, password, meta = {}) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new AppError("E-posta veya sifre hatali.", 401);
  }

  const matches = await comparePassword(password, user.passwordHash);

  if (!matches) {
    throw new AppError("E-posta veya sifre hatali.", 401);
  }

  const tokens = await createRefreshSession(user, meta);

  return {
    user: sanitizeUser(user),
    tokens
  };
}

export async function refreshUserSession(refreshToken, meta = {}) {
  if (!refreshToken) {
    throw new AppError("Refresh oturumu bulunamadi.", 401);
  }

  const tokenHash = hashToken(refreshToken);
  const result = await runRead(
    `
      MATCH (user:User)-[:HAS_SESSION]->(session:Session {tokenHash: $tokenHash})
      RETURN user { .* } AS user, session { .* } AS session
      LIMIT 1
    `,
    { tokenHash }
  );

  const record = result.records[0];
  const user = record?.get("user");
  const session = record?.get("session");

  if (!user || !session) {
    throw new AppError("Refresh oturumu gecersiz.", 401);
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await revokeSession(refreshToken);
    throw new AppError("Refresh oturumu suresi doldu.", 401);
  }

  await revokeSession(refreshToken);
  const tokens = await createRefreshSession(user, meta);

  return {
    user: sanitizeUser(user),
    tokens
  };
}

export async function revokeSession(refreshToken) {
  if (!refreshToken) {
    return;
  }

  await runWrite(
    `
      MATCH (:User)-[:HAS_SESSION]->(session:Session {tokenHash: $tokenHash})
      DETACH DELETE session
    `,
    { tokenHash: hashToken(refreshToken) }
  );
}

export function getPublicDemoAccounts() {
  return {
    password: appConfig.demoPassword,
    accounts: getDemoAccounts()
  };
}

export async function updateCurrentUser(userId, payload) {
  const current = await getCurrentUser(userId);

  if (!current) {
    throw new AppError("Kullanici bulunamadi.", 404);
  }

  const profileImage = await saveProfileImage(payload.profileImage);
  const removeProfileImage = Boolean(payload.removeProfileImage);
  const nextUser = {
    name: payload.name ?? current.name,
    headline: payload.headline ?? current.headline,
    city: payload.city ?? current.city,
    bio: payload.bio ?? current.bio,
    color: payload.color ?? current.color,
    updatedAt: new Date().toISOString(),
    profileImageUrl: profileImage?.url ?? null,
    profileImageMime: profileImage?.mime ?? null,
    profileImageName: profileImage?.name ?? null
  };

  try {
    const result = await runWrite(
      `
        MATCH (user:User {id: $userId})
        SET user.name = $user.name,
            user.headline = $user.headline,
            user.city = $user.city,
            user.bio = $user.bio,
            user.color = $user.color,
            user.updatedAt = $user.updatedAt
        FOREACH (_ IN CASE WHEN $setImage THEN [1] ELSE [] END |
          SET user.profileImageUrl = $user.profileImageUrl,
              user.profileImageMime = $user.profileImageMime,
              user.profileImageName = $user.profileImageName
        )
        FOREACH (_ IN CASE WHEN $clearImage THEN [1] ELSE [] END |
          REMOVE user.profileImageUrl
          REMOVE user.profileImageMime
          REMOVE user.profileImageName
        )
        RETURN user {
          .id,
          .name,
          .email,
          .role,
          .headline,
          .city,
          .bio,
          .color,
          .profileImageUrl,
          .profileImageMime,
          .profileImageName,
          .createdAt
        } AS user
      `,
      {
        userId,
        user: nextUser,
        setImage: Boolean(profileImage),
        clearImage: removeProfileImage && !profileImage
      }
    );

    if (profileImage || removeProfileImage) {
      await removeUploadByUrl(current.profileImageUrl);
    }

    return result.records[0]?.get("user") ?? null;
  } catch (error) {
    await removeSavedUpload(profileImage);
    throw error;
  }
}
```

## src/routes/graph.js

```js
import express from "express";
import { asyncHandler } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";
import { readLimiter } from "../middleware/rateLimit.js";
import { validateQuery } from "../middleware/validate.js";
import { optionalTargetQuerySchema } from "../validation/schemas.js";
import {
  getCommunities,
  getDijkstraPath,
  getEmbeddingPreview,
  getGraphNetwork,
  getGraphRuntimeStatus,
  getPageRankLeaders
} from "../services/graphService.js";

const router = express.Router();

router.use(requireAuth, readLimiter);

router.get(
  "/status",
  asyncHandler(async (_req, res) => {
    res.json(await getGraphRuntimeStatus());
  })
);

router.get(
  "/network",
  asyncHandler(async (req, res) => {
    res.json(await getGraphNetwork(req.user.id));
  })
);

router.get(
  "/communities",
  asyncHandler(async (_req, res) => {
    res.json({ communities: await getCommunities() });
  })
);

router.get(
  "/pagerank",
  asyncHandler(async (_req, res) => {
    res.json({ leaders: await getPageRankLeaders() });
  })
);

router.get(
  "/embeddings",
  asyncHandler(async (_req, res) => {
    res.json({ embeddings: await getEmbeddingPreview() });
  })
);

router.get(
  "/shortest-path",
  validateQuery(optionalTargetQuerySchema),
  asyncHandler(async (req, res) => {
    res.json(await getDijkstraPath(req.user.id, req.query.targetId));
  })
);

export default router;
```

## src/routes/social.js

```js
import express from "express";
import { asyncHandler } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { readLimiter, writeLimiter } from "../middleware/rateLimit.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import {
  commentParamSchema,
  commentSchema,
  followSchema,
  idParamSchema,
  notificationParamSchema,
  optionalTargetQuerySchema,
  paginationSchema,
  postIdParamSchema,
  postUpdateSchema,
  postSchema,
  targetQuerySchema
} from "../validation/schemas.js";
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  followUser,
  getDashboard,
  getGroups,
  getNotifications,
  getPostById,
  getPostList,
  getUserProfile,
  likePost,
  listUsers,
  markAllNotificationsRead,
  markNotificationRead,
  unfollowUser,
  unlikePost,
  updatePost
} from "../services/socialService.js";
import { seedDemoGraph } from "../db/init.js";
import { getCurrentUser } from "../services/authService.js";

const router = express.Router();

router.use(requireAuth);

router.get(
  "/me",
  readLimiter,
  asyncHandler(async (req, res) => {
    const user = await getCurrentUser(req.user.id);
    res.json({ user });
  })
);

router.get(
  "/dashboard",
  readLimiter,
  validateQuery(optionalTargetQuerySchema),
  asyncHandler(async (req, res) => {
    const dashboard = await getDashboard({
      viewerId: req.user.id,
      targetId: req.query.targetId
    });

    res.json(dashboard);
  })
);

router.get(
  "/notifications",
  readLimiter,
  asyncHandler(async (req, res) => {
    const notifications = await getNotifications(req.user.id);
    res.json({ notifications });
  })
);

router.patch(
  "/notifications/read-all",
  writeLimiter,
  asyncHandler(async (req, res) => {
    const notifications = await markAllNotificationsRead(req.user.id);
    res.json({ notifications });
  })
);

router.patch(
  "/notifications/:notificationId/read",
  writeLimiter,
  validateParams(notificationParamSchema),
  asyncHandler(async (req, res) => {
    const notification = await markNotificationRead(req.user.id, req.params.notificationId);
    res.json({ notification });
  })
);

router.get(
  "/users",
  readLimiter,
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const users = await listUsers(req.user.id, req.query);
    res.json({ users });
  })
);

router.get(
  "/groups",
  readLimiter,
  asyncHandler(async (req, res) => {
    const groups = await getGroups();
    res.json({ groups });
  })
);

router.get(
  "/users/:userId",
  readLimiter,
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const profile = await getUserProfile(req.params.userId, req.user.id);
    res.json({ profile });
  })
);

router.post(
  "/follows",
  writeLimiter,
  validateBody(followSchema),
  asyncHandler(async (req, res) => {
    await followUser(req.user.id, req.body.targetId);
    res.status(204).end();
  })
);

router.delete(
  "/follows",
  writeLimiter,
  validateQuery(targetQuerySchema),
  asyncHandler(async (req, res) => {
    await unfollowUser(req.user.id, req.query.targetId);
    res.status(204).end();
  })
);

router.get(
  "/posts",
  readLimiter,
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const posts = await getPostList(req.user.id, req.query);
    res.json({ posts });
  })
);

router.get(
  "/posts/:postId",
  readLimiter,
  validateParams(postIdParamSchema),
  asyncHandler(async (req, res) => {
    const post = await getPostById(req.params.postId, req.user.id);
    res.json({ post });
  })
);

router.post(
  "/posts",
  writeLimiter,
  validateBody(postSchema),
  asyncHandler(async (req, res) => {
    const post = await createPost({
      authorId: req.user.id,
      content: req.body.content,
      media: req.body.media
    });
    res.status(201).json({ post });
  })
);

router.patch(
  "/posts/:postId",
  writeLimiter,
  validateParams(postIdParamSchema),
  validateBody(postUpdateSchema),
  asyncHandler(async (req, res) => {
    const post = await updatePost(req.user.id, req.user.role, req.params.postId, {
      content: req.body.content,
      media: req.body.media,
      removeMedia: req.body.removeMedia
    });
    res.json({ post });
  })
);

router.delete(
  "/posts/:postId",
  writeLimiter,
  validateParams(postIdParamSchema),
  asyncHandler(async (req, res) => {
    await deletePost(req.user.id, req.user.role, req.params.postId);
    res.status(204).end();
  })
);

router.post(
  "/posts/:postId/like",
  writeLimiter,
  validateParams(postIdParamSchema),
  asyncHandler(async (req, res) => {
    await likePost(req.user.id, req.params.postId);
    res.status(204).end();
  })
);

router.delete(
  "/posts/:postId/like",
  writeLimiter,
  validateParams(postIdParamSchema),
  asyncHandler(async (req, res) => {
    await unlikePost(req.user.id, req.params.postId);
    res.status(204).end();
  })
);

router.post(
  "/posts/:postId/comments",
  writeLimiter,
  validateParams(postIdParamSchema),
  validateBody(commentSchema),
  asyncHandler(async (req, res) => {
    const comment = await createComment({
      authorId: req.user.id,
      postId: req.params.postId,
      content: req.body.content
    });
    res.status(201).json({ comment });
  })
);

router.delete(
  "/posts/:postId/comments/:commentId",
  writeLimiter,
  validateParams(commentParamSchema),
  asyncHandler(async (req, res) => {
    await deleteComment(req.user.id, req.params.postId, req.params.commentId, req.user.role);
    res.status(204).end();
  })
);

router.post(
  "/demo/reset",
  writeLimiter,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    await seedDemoGraph({ reset: true });
    res.status(204).end();
  })
);

export default router;
```

## test/security.test.js

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  comparePassword,
  hashPassword,
  hashToken,
  normalizeEmail,
  signAccessToken,
  verifyAccessToken
} from "../src/lib/security.js";
import request from "supertest";
import { app } from "../src/server.js";

test("normalizeEmail trims and lowercases", () => {
  assert.equal(normalizeEmail("  USER@Example.COM "), "user@example.com");
});

test("hashPassword and comparePassword round-trip", async () => {
  const plain = "demo12345";
  const passwordHash = await hashPassword(plain);

  assert.notEqual(passwordHash, plain);
  assert.equal(await comparePassword(plain, passwordHash), true);
  assert.equal(await comparePassword("wrong-password", passwordHash), false);
});

test("hashToken is deterministic and hides raw token", () => {
  const raw = "refresh-token-value";
  const first = hashToken(raw);
  const second = hashToken(raw);

  assert.equal(first, second);
  assert.notEqual(first, raw);
  assert.equal(first.length, 64);
});

test("signed access token can be verified", () => {
  const token = signAccessToken({
    id: "user-1",
    email: "user@example.com",
    name: "User One",
    role: "member"
  });

  const payload = verifyAccessToken(token);

  assert.equal(payload.sub, "user-1");
  assert.equal(payload.email, "user@example.com");
  assert.equal(payload.role, "member");
});

test("content security policy blocks inline scripts", async () => {
  const response = await request(app).get("/");
  const csp = response.headers["content-security-policy"] ?? "";

  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
});
```

## test/socialRoutes.test.js

```js
import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { app } from "../src/server.js";
import { signAccessToken } from "../src/lib/security.js";

function authHeader(overrides = {}) {
  const token = signAccessToken({
    id: overrides.id ?? "route-test-user",
    email: overrides.email ?? "route-test@example.com",
    name: overrides.name ?? "Route Test",
    role: overrides.role ?? "member"
  });

  return `Bearer ${token}`;
}

test("social routes reject unauthenticated requests", async () => {
  const response = await request(app).get("/api/posts").expect(401);

  assert.match(response.body.error, /Oturum bulunamadi/i);
});

test("social post listing rejects invalid pagination before hitting services", async () => {
  const response = await request(app)
    .get("/api/posts?limit=101&offset=0")
    .set("Authorization", authHeader())
    .expect(400);

  assert.match(response.body.error, /limit/i);
});

test("social user listing rejects negative offsets", async () => {
  const response = await request(app)
    .get("/api/users?limit=20&offset=-1")
    .set("Authorization", authHeader())
    .expect(400);

  assert.match(response.body.error, /offset/i);
});

test("social post creation rejects empty content without media", async () => {
  const response = await request(app)
    .post("/api/posts")
    .set("Authorization", authHeader())
    .send({ content: "   " })
    .expect(400);

  assert.match(response.body.error, /Paylasim icin metin/i);
});

test("social comment creation rejects one-character comments", async () => {
  const response = await request(app)
    .post("/api/posts/post-1/comments")
    .set("Authorization", authHeader())
    .send({ content: "x" })
    .expect(400);

  assert.match(response.body.error, /Yorum metni/i);
});

test("social follow creation rejects missing target id", async () => {
  const response = await request(app)
    .post("/api/follows")
    .set("Authorization", authHeader())
    .send({})
    .expect(400);

  assert.match(response.body.error, /Hedef kullanici/i);
});

test("demo reset requires admin role", async () => {
  const response = await request(app)
    .post("/api/demo/reset")
    .set("Authorization", authHeader({ role: "member" }))
    .expect(403);

  assert.match(response.body.error, /yetkiniz yok/i);
});
```

## test/graphService.unit.test.js

```js
import assert from "node:assert/strict";
import { after } from "node:test";
import test from "node:test";
import { closeDriver } from "../src/db/neo4j.js";
import { getGraphRuntimeStatus } from "../src/services/graphService.js";

let databaseAvailable = true;

try {
  const { verifyConnection } = await import("../src/db/neo4j.js");
  await verifyConnection();
} catch (_error) {
  databaseAvailable = false;
}

after(async () => {
  await closeDriver();
});

test("getGraphRuntimeStatus returns an availability object", { skip: !databaseAvailable }, async () => {
  const result = await getGraphRuntimeStatus();

  assert.equal(typeof result, "object");
  assert.equal(typeof result.gdsAvailable, "boolean");
  assert.equal(typeof result.apocAvailable, "boolean");
  assert.ok("gdsVersion" in result);
  assert.ok("apocVersion" in result);
});

test("getGraphRuntimeStatus has graceful fallback when plugins unavailable", { skip: !databaseAvailable }, async () => {
  const result = await getGraphRuntimeStatus();

  if (!result.gdsAvailable) {
    assert.ok(typeof result.gdsVersion === "string");
  }

  if (!result.apocAvailable) {
    assert.ok(typeof result.apocVersion === "string");
  }

  assert.ok(result);
});

test("getGraphRuntimeStatus returns correct structure for all cases", async () => {
  const result = await getGraphRuntimeStatus();

  assert.equal(typeof result, "object");
  assert.equal(typeof result.gdsAvailable, "boolean");
  assert.equal(typeof result.apocAvailable, "boolean");
});
```

## test/auth-flow.test.js

```js
import assert from "node:assert/strict";
import { after } from "node:test";
import test from "node:test";
import request from "supertest";
import { app } from "../src/server.js";
import { closeDriver, verifyConnection } from "../src/db/neo4j.js";

let databaseAvailable = true;

try {
  await verifyConnection();
} catch (_error) {
  databaseAvailable = false;
}

after(async () => {
  await closeDriver();
});

test("signup, session, notifications, logout, login, and demo access work end to end", { skip: !databaseAvailable }, async () => {
  const suffix = Date.now();
  const agent = request.agent(app);
  const email = `integration-${suffix}@graphlink.local`;
  const password = "StrongTest123";

  const signupResponse = await agent
    .post("/api/auth/register")
    .send({
      name: "Integration User",
      email,
      password,
      headline: "Authentication Tester",
      city: "Bitlis",
      bio: "End-to-end auth flow verification",
      color: "#0f766e"
    })
    .expect(201);

  assert.equal(signupResponse.body.user.email, email);
  assert.match(signupResponse.headers["set-cookie"].join(";"), /access_token=/);
  assert.match(signupResponse.headers["set-cookie"].join(";"), /HttpOnly/);

  const meResponse = await agent.get("/api/auth/me").expect(200);
  assert.equal(meResponse.body.user.email, email);

  const notificationResponse = await agent.get("/api/notifications").expect(200);
  assert.ok(Array.isArray(notificationResponse.body.notifications));
  assert.ok(notificationResponse.body.notifications.length >= 1);

  await agent.post("/api/auth/logout").expect(204);
  await agent.get("/api/auth/me").expect(401);

  const loginAgent = request.agent(app);
  const loginResponse = await loginAgent.post("/api/auth/login").send({ email, password }).expect(200);
  assert.equal(loginResponse.body.user.email, email);

  const demoResponse = await request(app).get("/api/auth/demo-accounts").expect(200);
  assert.ok(demoResponse.body.accounts.length > 0);

  const demoAgent = request.agent(app);
  const demoLoginResponse = await demoAgent
    .post("/api/auth/login")
    .send({
      email: demoResponse.body.accounts[0].email,
      password: demoResponse.body.password
    })
    .expect(200);

  assert.equal(demoLoginResponse.body.user.email, demoResponse.body.accounts[0].email);
});

test("monitoring endpoint confirms API and database communication", { skip: !databaseAvailable }, async () => {
  const response = await request(app).get("/api/monitoring/status").expect(200);

  assert.equal(response.body.ok, true);
  assert.equal(response.body.checks.api.ok, true);
  assert.equal(response.body.checks.database.ok, true);
  assert.equal(response.body.checks.frontendBackend.ok, true);
});
```

## .github/workflows/ci.yml

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      neo4j:
        image: neo4j:5-community
        env:
          NEO4J_AUTH: none
        ports:
          - 7474:7474
          - 7687:7687
        options: >-
          --health-cmd "cypher-shell -a bolt://localhost:7687 'RETURN 1'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 12

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run repository status check
        run: npm run check:status

      - name: Validate Docker Compose
        run: docker compose config

      - name: Run lint
        run: npm run lint

      - name: Seed Neo4j test graph
        run: npm run seed:graph
        env:
          NEO4J_URI: bolt://127.0.0.1:7687
          NEO4J_AUTH_DISABLED: "true"
          AUTO_SEED: "true"

      - name: Run tests
        run: npm test
        env:
          NEO4J_URI: bolt://127.0.0.1:7687
          NEO4J_AUTH_DISABLED: "true"
```

## docker-compose.yml

```yaml
services:
  neo4j:
    image: neo4j:5-community
    restart: unless-stopped
    environment:
      NEO4J_AUTH: none
      NEO4J_PLUGINS: '["apoc", "graph-data-science"]'
      NEO4J_dbms_security_procedures_allowlist: "gds.*,apoc.*"
      NEO4J_dbms_security_procedures_unrestricted: "gds.*,apoc.*"
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4j-data:/data
      - neo4j-logs:/logs
      - neo4j-plugins:/plugins
    healthcheck:
      test: ["CMD-SHELL", "cypher-shell -a bolt://localhost:7687 'RETURN 1' || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 12

  app:
    build: .
    restart: unless-stopped
    depends_on:
      neo4j:
        condition: service_healthy
    environment:
      PORT: 3000
      NEO4J_URI: bolt://neo4j:7687
      NEO4J_USERNAME: neo4j
      NEO4J_PASSWORD: password
      NEO4J_DATABASE: neo4j
      NEO4J_AUTH_DISABLED: "true"
      JWT_SECRET: change-this-docker-development-secret
      AUTO_SEED: "true"
      COOKIE_SECURE: "false"
    ports:
      - "3000:3000"
    volumes:
      - uploaded-media:/app/public/uploads

volumes:
  neo4j-data:
  neo4j-logs:
  neo4j-plugins:
  uploaded-media:
```

## package.json

```json
{
  "name": "graphlink-social",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "node src/server.js",
    "dev": "node src/server.js",
    "test": "node --test",
    "lint": "eslint .",
    "check:status": "node scripts/check-status.js",
    "docker:up": "docker compose up --build",
    "docker:down": "docker compose down",
    "seed": "node src/server.js --seed-only",
    "seed:graph": "node src/server.js --seed-only",
    "report": "python scripts/generate_report.py",
    "neo4j:setup": "node scripts/neo4j-docker.js setup",
    "neo4j:start": "node scripts/neo4j-docker.js start",
    "neo4j:stop": "node scripts/neo4j-docker.js stop",
    "neo4j:setup:windows": "powershell -ExecutionPolicy Bypass -File ./scripts/setup-neo4j.ps1",
    "neo4j:start:windows": "powershell -ExecutionPolicy Bypass -File ./scripts/start-neo4j.ps1",
    "neo4j:stop:windows": "powershell -ExecutionPolicy Bypass -File ./scripts/stop-neo4j.ps1"
  },
  "dependencies": {
    "bcryptjs": "^3.0.2",
    "cookie-parser": "^1.4.7",
    "cytoscape": "^3.32.0",
    "dotenv": "^16.5.0",
    "express": "^4.21.2",
    "express-rate-limit": "^8.5.2",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.2",
    "neo4j-driver": "^5.28.1",
    "swagger-ui-dist": "5.11.0",
    "zod": "^3.25.4"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "eslint": "^10.4.0",
    "globals": "^17.6.0",
    "supertest": "^7.1.0"
  }
}
```
