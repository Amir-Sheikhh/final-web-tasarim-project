# Development History

This repository is not a 3-commit dump. The current `main` branch has 27 commits at the last local verification point and shows iterative work across features, tests, security, CI, Docker, dependency hygiene, and reviewer-facing documentation.

## Current Verified Head

- Branch: `main`
- Commit count at last verification: `27`
- Verified head before final examiner hygiene pass: `9bb74699acf824150d76f61b7c13acb46019ff96`

## Commit Timeline

```text
9bb7469 docs: add comprehensive English README
fdea2c7 feat: add nodemon for hot-reload development
77f888d docs: update README with badges and documentation links
e5efb01 feat: add GitHub issue and PR templates
6bdb01e docs: add deployment guide and API error documentation
137fb86 docs: add governance and community guidelines
3924633 ci: add coverage enforcement and security audit
b10a58f test: add c8 code coverage tool
f426b92 docs: expose development history to reviewers
e64cfa1 docs: add self-contained code review bundle
c291050 docs: add reviewer entry points
c0d0a5f test: cover social route negative paths and harden ci
7402da7 chore: tighten dependency hygiene and add linting
ee27b58 chore: align test runner and cross-platform neo4j setup
054b681 chore: add docker compose and ci workflow
73282ac chore: add docker ci and organize deliverables
b9ecbc8 test: add repository status self-check
97d9e9f security: tighten CSP script policy
6fc1982 security: add XSS sanitization + unit tests
a7cc622 docs: update changelog for v1.2.0 with test improvements
5972112 test: add sanitize and pagination unit tests
751c2d5 test: enhance graphService and validation test coverage
ce77e53 test: add comprehensive unit tests for socialService validation
61f6fba feat: complete final project improvements
17e34bb Fix demo groups endpoint
03747c0 Add student information to README
934ca28 Prepare GraphLink final project submission
```

## What Changed Iteratively

- Initial final project structure and student metadata.
- Demo group endpoint fix.
- Social service validation and service test coverage.
- Graph runtime and pagination unit coverage.
- XSS sanitization helper and tests.
- OpenAPI/README changelog updates.
- CSP hardening by removing inline script allowance.
- Repository status self-check.
- PowerPoint moved into `docs/`.
- Dockerfile and Docker Compose added.
- GitHub Actions CI added.
- Node test runner / Vitest mismatch removed.
- Cross-platform Neo4j setup added through Docker-backed scripts.
- Dependency hygiene tightened by removing Scarf telemetry and declaring runtime dependencies.
- ESLint added and wired into CI.
- Negative-path social route tests added.
- CI updated to run Neo4j service and seed test graph.
- Reviewer-facing documentation and single-file code review bundle added.
