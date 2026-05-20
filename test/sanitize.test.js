import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/lib/sanitize.js';

test('escapeHtml converts < and >', () => {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
});
test('escapeHtml handles null', () => {
  assert.equal(escapeHtml(null), '');
});
test('escapeHtml converts ampersand', () => {
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
});
