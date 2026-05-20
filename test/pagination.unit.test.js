import assert from "node:assert/strict";
import test from "node:test";
import { paginationSchema } from "../src/validation/schemas.js";

test("paginationSchema default limit is 20", () => {
  const result = paginationSchema.parse({});
  assert.equal(result.limit, 20);
});

test("paginationSchema default offset is 0", () => {
  const result = paginationSchema.parse({});
  assert.equal(result.offset, 0);
});

test("paginationSchema accepts limit 1 to 100", () => {
  const min = paginationSchema.parse({ limit: 1 });
  assert.equal(min.limit, 1);

  const max = paginationSchema.parse({ limit: 100 });
  assert.equal(max.limit, 100);
});

test("paginationSchema rejects limit > 100", () => {
  assert.throws(() => paginationSchema.parse({ limit: 101 }));
});

test("paginationSchema rejects limit < 1", () => {
  assert.throws(() => paginationSchema.parse({ limit: 0 }));
});

test("paginationSchema accepts offset >= 0", () => {
  const result = paginationSchema.parse({ offset: 0 });
  assert.equal(result.offset, 0);

  const result2 = paginationSchema.parse({ offset: 1000 });
  assert.equal(result2.offset, 1000);
});

test("paginationSchema rejects negative offset", () => {
  assert.throws(() => paginationSchema.parse({ offset: -1 }));
});

test("paginationSchema coerces string numbers", () => {
  const result = paginationSchema.parse({ limit: "50", offset: "10" });
  assert.equal(result.limit, 50);
  assert.equal(result.offset, 10);
});
