# Reviewer Entry Points

This file points reviewers to the source files that prove the main architecture, security, graph, test, CI, and repository hygiene claims.

## Verified Status

- Latest verified branch: `main`
- Local verification commands:
  - `npm run check:status`
  - `npm run lint`
  - `npm test`
- Current local result: 54 passing tests, 4 skipped only when local Neo4j is unavailable.
- CI starts Neo4j as a service container, seeds the graph, lints, and runs tests.

## Core Source

- Express app, Helmet CSP, JSON body limit, static/docs routing: [`src/server.js`](src/server.js)
- Auth service, password hashing, refresh session rotation: [`src/services/authService.js`](src/services/authService.js)
- Auth middleware, cookie/bearer token checks, role guard: [`src/middleware/auth.js`](src/middleware/auth.js)
- Graph API routes: [`src/routes/graph.js`](src/routes/graph.js)
- Social API routes: [`src/routes/social.js`](src/routes/social.js)
- Zod schemas and negative-path validation: [`src/validation/schemas.js`](src/validation/schemas.js)
- Upload limits and cleanup logging: [`src/lib/uploads.js`](src/lib/uploads.js)

## Tests

- Security tests: [`test/security.test.js`](test/security.test.js)
- Social route negative-path tests: [`test/socialRoutes.test.js`](test/socialRoutes.test.js)
- Graph runtime tests: [`test/graphService.unit.test.js`](test/graphService.unit.test.js)
- Auth integration flow: [`test/auth-flow.test.js`](test/auth-flow.test.js)
- Validation coverage: [`test/validation.test.js`](test/validation.test.js)

## DevOps And Hygiene

- GitHub Actions CI with Neo4j service: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
- Docker Compose app + Neo4j stack: [`docker-compose.yml`](docker-compose.yml)
- ESLint flat config: [`eslint.config.js`](eslint.config.js)
- Dependency declarations and scripts: [`package.json`](package.json)
- Lockfile without Vitest or Scarf telemetry: [`package-lock.json`](package-lock.json)

## Raw Main URLs

Use these if an external reviewer cannot browse repository files normally:

- https://raw.githubusercontent.com/Amir-Sheikhh/final-web-tasarim-project/main/src/server.js
- https://raw.githubusercontent.com/Amir-Sheikhh/final-web-tasarim-project/main/src/services/authService.js
- https://raw.githubusercontent.com/Amir-Sheikhh/final-web-tasarim-project/main/src/routes/graph.js
- https://raw.githubusercontent.com/Amir-Sheikhh/final-web-tasarim-project/main/src/middleware/auth.js
- https://raw.githubusercontent.com/Amir-Sheikhh/final-web-tasarim-project/main/src/validation/schemas.js
- https://raw.githubusercontent.com/Amir-Sheikhh/final-web-tasarim-project/main/test/security.test.js
- https://raw.githubusercontent.com/Amir-Sheikhh/final-web-tasarim-project/main/test/socialRoutes.test.js
- https://raw.githubusercontent.com/Amir-Sheikhh/final-web-tasarim-project/main/.github/workflows/ci.yml
