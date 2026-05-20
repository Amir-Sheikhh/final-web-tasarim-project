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
