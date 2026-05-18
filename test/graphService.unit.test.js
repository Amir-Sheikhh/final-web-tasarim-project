import assert from "node:assert/strict";
import { after } from "node:test";
import test from "node:test";
import { closeDriver } from "../src/db/neo4j.js";
import { getGraphRuntimeStatus } from "../src/services/graphService.js";

after(async () => {
  await closeDriver();
});

test("getGraphRuntimeStatus returns an availability object when graph plugins are unavailable", async () => {
  const result = await getGraphRuntimeStatus();

  assert.equal(typeof result, "object");
  assert.equal(typeof result.gdsAvailable, "boolean");
  assert.equal(typeof result.apocAvailable, "boolean");
  assert.ok("gdsVersion" in result);
  assert.ok("apocVersion" in result);
});
