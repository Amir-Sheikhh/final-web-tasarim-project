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
