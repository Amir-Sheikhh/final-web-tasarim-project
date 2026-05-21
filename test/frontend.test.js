import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { app } from "../src/server.js";

test("frontend shell and static assets are served", async () => {
  const home = await request(app).get("/").expect(200);

  assert.match(home.text, /Elite Circle/);
  assert.match(home.text, /\/styles\.css/);
  assert.match(home.text, /\/theme-init\.js/);
  assert.match(home.text, /\/assets\/elite-circle-logo\.svg/);

  const styles = await request(app).get("/styles.css").expect(200);
  assert.match(styles.headers["content-type"], /text\/css/);
  assert.match(styles.text, /--bg:/);

  const appScript = await request(app).get("/app.js").expect(200);
  assert.match(appScript.headers["content-type"], /javascript/);
  assert.match(appScript.text, /const state =/);

  const logo = await request(app).get("/assets/elite-circle-logo.svg").expect(200);
  assert.match(logo.headers["content-type"], /image\/svg\+xml/);
});

test("swagger documentation entry point is served at /docs", async () => {
  const response = await request(app).get("/docs").expect(200);

  assert.match(response.text, /SwaggerUIBundle|openapi\.yaml/);
});
