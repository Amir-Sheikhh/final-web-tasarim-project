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
