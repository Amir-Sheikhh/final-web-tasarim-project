import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const requiredFiles = [
  ".github/workflows/ci.yml",
  "Dockerfile",
  "docker-compose.yml",
  "eslint.config.js",
  "scripts/neo4j-docker.js",
  "src/lib/sanitize.js",
  "test/socialRoutes.test.js",
  "test/sanitize.test.js",
  "test/pagination.unit.test.js",
  "docs/openapi.yaml",
  "docs/GraphLink_Gamma_Sunum_Turkce_fixed_working.pptx",
  "README.md"
];

function readText(path) {
  assert.equal(fs.existsSync(path), true, `${path} is missing`);
  return fs.readFileSync(path, "utf8");
}

for (const file of requiredFiles) {
  readText(file);
}

const sanitize = readText("src/lib/sanitize.js");
assert.match(sanitize, /export function escapeHtml/);
assert.match(sanitize, /&amp;/);
assert.match(sanitize, /&lt;/);
assert.match(sanitize, /&gt;/);
assert.match(sanitize, /&quot;/);
assert.match(sanitize, /&#x27;/);

const sanitizeTest = readText("test/sanitize.test.js");
assert.match(sanitizeTest, /escapeHtml/);
assert.match(sanitizeTest, /<script>/);
assert.match(sanitizeTest, /a & b/);

const schemas = readText("src/validation/schemas.js");
assert.match(schemas, /export const paginationSchema/);
assert.match(schemas, /limit en fazla 100 olabilir/);
assert.match(schemas, /offset negatif olamaz/);

const openapi = readText("docs/openapi.yaml");
assert.match(openapi, /name: limit/);
assert.match(openapi, /name: offset/);
assert.match(openapi, /maximum: 100/);

const readme = readText("README.md");
assert.match(readme, /v1\.2\.0/);
assert.match(readme, /XSS Sanitization/);
assert.match(readme, /Pagination/);
assert.match(readme, /Docker Compose/);
assert.match(readme, /GitHub Actions/);
assert.match(readme, /node --test/);
assert.match(readme, /ESLint/);
assert.match(readme, /Neo4j service/);
assert.match(readme, /12mb/);

const compose = readText("docker-compose.yml");
assert.match(compose, /neo4j:5-community/);
assert.match(compose, /bolt:\/\/neo4j:7687/);

const ci = readText(".github/workflows/ci.yml");
assert.match(ci, /npm ci/);
assert.match(ci, /npm test/);
assert.match(ci, /npm run lint/);
assert.match(ci, /docker compose config/);
assert.match(ci, /services:/);
assert.match(ci, /neo4j:5-community/);
assert.match(ci, /npm run seed:graph/);

const packageJson = JSON.parse(readText("package.json"));
assert.equal(packageJson.scripts.test, "node --test");
assert.equal(packageJson.scripts.lint, "eslint .");
assert.equal(packageJson.devDependencies.vitest, undefined);
assert.notEqual(packageJson.devDependencies.eslint, undefined);
assert.match(packageJson.scripts["neo4j:setup"], /node scripts\/neo4j-docker\.js setup/);
assert.match(packageJson.scripts["neo4j:setup:windows"], /setup-neo4j\.ps1/);

const packageLock = readText("package-lock.json");
assert.doesNotMatch(packageLock, /"vitest"/);
assert.doesNotMatch(packageLock, /@scarf\/scarf/);

const server = readText("src/server.js");
assert.match(server, /express\.json\(\{ limit: appConfig\.jsonBodyLimit \}\)/);

const remoteHead = execFileSync("git", ["ls-remote", "origin", "refs/heads/main"], {
  encoding: "utf8"
}).trim();
assert.match(remoteHead, /^[0-9a-f]{40}\s+refs\/heads\/main$/);

console.log("Repository status check passed.");
console.log(remoteHead);
