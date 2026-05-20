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
