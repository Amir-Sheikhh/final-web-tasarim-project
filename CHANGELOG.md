# Changelog

All notable changes to GraphLink Social are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Code coverage reporting with c8 (80% line threshold)
- Security audit in CI/CD pipeline
- Community governance documentation:
  - CONTRIBUTING.md - Contributor guidelines
  - CODE_OF_CONDUCT.md - Community standards
  - SECURITY.md - Vulnerability disclosure policy
- Deployment guide (DEPLOYMENT.md)
- GitHub issue and pull request templates
- Professional documentation links in README

## [1.3.0] - 2026-05-20

### Added
- Docker Compose support: Run app and Neo4j with `npm run docker:up`
- GitHub Actions CI pipeline with automated testing
- ESLint configuration and CI integration
- Social route negative-path test coverage (auth, validation, role guards)
- Neo4j service in GitHub Actions with automatic seeding

### Changed
- Neo4j setup to use Docker as default (cross-platform)
- JSON body limit from 30MB to 12MB (configurable)
- Upload cleanup errors now logged as warnings instead of silently ignored

### Fixed
- Test runner compatibility: Removed Vitest, standardized on Node.js built-in `node --test`
- Neo4j cross-platform command support with PowerShell aliases for Windows

### Security
- Content Security Policy (CSP) tightened for script handling
- Helmet.js headers configured for production

## [1.2.0] - 2026-05-20

### Added
- XSS protection with HTML escaping (`escapeHtml()`)
- Pagination support for `/api/posts` and `/api/users` endpoints
- Comprehensive unit tests for sanitization and validation
- GraphService fallback for missing GDS/APOC plugins
- OpenAPI documentation for pagination parameters

### Tests
- `test/sanitize.unit.test.js` - XSS prevention validation
- `test/pagination.unit.test.js` - Pagination parameter validation
- `test/socialService.test.js` - Service layer validation
- `test/graphService.unit.test.js` - Plugin availability checks
- `test/validation.test.js` - Schema validation coverage

## [1.1.0] - 2026-05-20

### Added
- XSS sanitization for post and comment content
- Pagination with `limit` and `offset` parameters
- Unit tests for sanitization and validation (Neo4j-independent)
- OpenAPI spec updates with pagination parameters

### Security
- HTML content escaping to prevent XSS attacks

## [1.0.0] - 2026-05-20

### Added
- Initial release with full-stack social network application
- Neo4j graph database with Cypher queries
- JWT authentication with refresh tokens
- Cytoscape.js graph visualization
- OpenAPI 3.1 API documentation
- Docker Compose development environment
- Comprehensive test suite with Node.js test runner

### Features
- User authentication and profile management
- Follow/Unfollow relationships
- Post creation and interactions (like, comment)
- Graph-based recommendations and discovery
- Real-time network visualization
- Role-based access control
- Rate limiting and security headers

---

## Version History

| Version | Release Date | Status |
|---------|------------|--------|
| 1.3.0 | 2026-05-20 | Latest |
| 1.2.0 | 2026-05-20 | Stable |
| 1.1.0 | 2026-05-20 | Supported |
| 1.0.0 | 2026-05-20 | Supported |

See [Deployment Guide](DEPLOYMENT.md) for version upgrade instructions.
