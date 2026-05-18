import assert from "node:assert/strict";
import test from "node:test";
import { escapeHtml } from "../src/lib/sanitize.js";

test("escapeHtml converts angle brackets", () => {
  assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
});

test("escapeHtml handles null and undefined", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
});

test("escapeHtml converts ampersand and quotes", () => {
  assert.equal(escapeHtml(`a & "b" 'c'`), "a &amp; &quot;b&quot; &#x27;c&#x27;");
});
