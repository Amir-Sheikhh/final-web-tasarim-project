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

## Embedded Evidence Snippets

These excerpts are duplicated here so reviewers that can only read README-level Markdown files can still verify the core claims.

### `src/server.js`: Helmet CSP And Configured Body Limit

```js
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        mediaSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    }
  })
);
app.use(express.json({ limit: appConfig.jsonBodyLimit }));
```

### `src/services/authService.js`: Refresh Rotation

```js
async function createRefreshSession(user, meta = {}) {
  const refreshToken = generateOpaqueToken();
  const tokenHash = hashToken(refreshToken);
  const session = {
    id: createId("session"),
    tokenHash,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + appConfig.jwt.refreshDays * 24 * 60 * 60 * 1000).toISOString(),
    userAgent: meta.userAgent || "Unknown",
    ipAddress: meta.ipAddress || "Unknown"
  };

  await runWrite(
    `
      MATCH (user:User {id: $userId})
      CREATE (session:Session {
        id: $session.id,
        tokenHash: $session.tokenHash,
        createdAt: $session.createdAt,
        expiresAt: $session.expiresAt,
        userAgent: $session.userAgent,
        ipAddress: $session.ipAddress
      })
      CREATE (user)-[:HAS_SESSION]->(session)
    `,
    { userId: user.id, session }
  );

  return {
    accessToken: signAccessToken(user),
    refreshToken
  };
}

export async function refreshUserSession(refreshToken, meta = {}) {
  if (!refreshToken) {
    throw new AppError("Refresh oturumu bulunamadi.", 401);
  }

  const tokenHash = hashToken(refreshToken);
  const result = await runRead(
    `
      MATCH (user:User)-[:HAS_SESSION]->(session:Session {tokenHash: $tokenHash})
      RETURN user { .* } AS user, session { .* } AS session
      LIMIT 1
    `,
    { tokenHash }
  );

  const record = result.records[0];
  const user = record?.get("user");
  const session = record?.get("session");

  if (!user || !session) {
    throw new AppError("Refresh oturumu gecersiz.", 401);
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await revokeSession(refreshToken);
    throw new AppError("Refresh oturumu suresi doldu.", 401);
  }

  await revokeSession(refreshToken);
  const tokens = await createRefreshSession(user, meta);

  return {
    user: sanitizeUser(user),
    tokens
  };
}
```

### `src/lib/security.js`: Password Hashing, Token Hashing, HttpOnly Cookies

```js
export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function accessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: appConfig.jwt.cookieSecure,
    path: "/",
    maxAge: appConfig.jwt.accessCookieMinutes * 60 * 1000
  };
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: appConfig.jwt.cookieSecure,
    path: "/",
    maxAge: appConfig.jwt.refreshDays * 24 * 60 * 60 * 1000
  };
}
```

### `test/socialRoutes.test.js`: Negative-Path Route Coverage

```js
function authHeader(overrides = {}) {
  const token = signAccessToken({
    id: overrides.id ?? "route-test-user",
    email: overrides.email ?? "route-test@example.com",
    name: overrides.name ?? "Route Test",
    role: overrides.role ?? "member"
  });

  return `Bearer ${token}`;
}

test("social routes reject unauthenticated requests", async () => {
  const response = await request(app).get("/api/posts").expect(401);

  assert.match(response.body.error, /Oturum bulunamadi/i);
});

test("social post listing rejects invalid pagination before hitting services", async () => {
  const response = await request(app)
    .get("/api/posts?limit=101&offset=0")
    .set("Authorization", authHeader())
    .expect(400);

  assert.match(response.body.error, /limit/i);
});

test("demo reset requires admin role", async () => {
  const response = await request(app)
    .post("/api/demo/reset")
    .set("Authorization", authHeader({ role: "member" }))
    .expect(403);

  assert.match(response.body.error, /yetkiniz yok/i);
});
```

### `.github/workflows/ci.yml`: Neo4j Service In CI

```yaml
services:
  neo4j:
    image: neo4j:5-community
    env:
      NEO4J_AUTH: none
    ports:
      - 7474:7474
      - 7687:7687
    options: >-
      --health-cmd "cypher-shell -a bolt://localhost:7687 'RETURN 1'"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 12

steps:
  - name: Run repository status check
    run: npm run check:status
  - name: Validate Docker Compose
    run: docker compose config
  - name: Run lint
    run: npm run lint
  - name: Seed Neo4j test graph
    run: npm run seed:graph
  - name: Run tests
    run: npm test
```
