import assert from "node:assert/strict";
import test from "node:test";
import { escapeHtml } from "../src/lib/sanitize.js";

test("escapeHtml escapes < to &lt;", () => {
  assert.equal(escapeHtml("<"), "&lt;");
});

test("escapeHtml escapes > to &gt;", () => {
  assert.equal(escapeHtml(">"), "&gt;");
});

test("escapeHtml escapes & to &amp;", () => {
  assert.equal(escapeHtml("&"), "&amp;");
});

test("escapeHtml escapes \" to &quot;", () => {
  assert.equal(escapeHtml('"'), "&quot;");
});

test("escapeHtml escapes ' to &#x27;", () => {
  assert.equal(escapeHtml("'"), "&#x27;");
});

test("escapeHtml handles mixed HTML", () => {
  assert.equal(
    escapeHtml('<script>alert("xss")</script>'),
    "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
  );
});

test("escapeHtml handles null", () => {
  assert.equal(escapeHtml(null), "");
});

test("escapeHtml handles undefined", () => {
  assert.equal(escapeHtml(undefined), "");
});
