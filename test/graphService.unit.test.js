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
