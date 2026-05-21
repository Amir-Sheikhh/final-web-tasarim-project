# GraphLink Social - Neo4j Graph Database Social Network

[![CI](https://github.com/Amir-Sheikhh/final-web-tasarim-project/actions/workflows/ci.yml/badge.svg)](https://github.com/Amir-Sheikhh/final-web-tasarim-project/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Coverage](https://img.shields.io/badge/coverage-c8%20report-blue.svg)](CHANGELOG.md)

A full-stack social networking application demonstrating Neo4j graph database capabilities. Built with Node.js, Express, and Cytoscape.js for interactive graph visualization. This project showcases relationship-driven features like friend discovery, content recommendations, and network analysis.

**🌍 Language:** [Türkçe (Turkish)](README.md) | English

## Quick Start

### Docker Compose (Recommended)
```bash
npm install
npm run docker:up
```

Access at:
- **App:** http://localhost:3000
- **Neo4j Browser:** http://localhost:7474
- **API Docs:** http://localhost:3000/docs

### Local Development
```bash
# Install dependencies
npm install

# Setup Neo4j
npm run neo4j:setup
npm run neo4j:start

# Configure environment
cp .env.example .env

# Seed database
npm run seed:graph

# Start dev server (with hot-reload)
npm run dev
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express.js, Neo4j Driver |
| **Database** | Neo4j Community/Enterprise, Cypher QL |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Graph Viz** | Cytoscape.js (interactive network visualization) |
| **Graph Analysis** | Neo4j Graph Data Science, APOC plugins |
| **Security** | Helmet.js, bcryptjs, JWT tokens, Zod validation |
| **Auth** | JWT access tokens + HttpOnly refresh cookies |
| **Testing** | Node.js built-in test runner, Supertest, c8 coverage |
| **API Docs** | OpenAPI 3.1 + Swagger UI |
| **DevOps** | Docker, Docker Compose, GitHub Actions CI/CD |

## Key Features

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh token rotation
- HttpOnly secure cookies (prevents XSS token theft)
- Role-based access control (RBAC)
- Automatic session management and logout

### 🤝 Social Graph
- **Relationships:** FOLLOWS, AUTHORED, LIKED, HAS_SESSION
- **Friend Discovery:** Multi-hop graph traversal (friend-of-friend)
- **Smart Recommendations:** Suggest content and users based on mutual connections
- **Network Analysis:** Community detection, PageRank, shortest paths

### 📊 Graph Visualization
- Real-time interactive network graph with Cytoscape.js
- Node filtering and relationship exploration
- Neo4j Browser integration for advanced queries
- Graph Data Science algorithm previews

### 🔒 Security
- XSS prevention (HTML content escaping)
- Content Security Policy (CSP) headers
- Rate limiting (configurable thresholds)
- Password hashing with bcryptjs
- Dependency vulnerability scanning

### 📈 API & Documentation
- RESTful API with pagination support
- OpenAPI 3.1 specification with Swagger UI
- Comprehensive error codes and documentation
- Request correlation IDs for debugging

## Project Structure

```
src/
  ├── server.js              Express app, middleware setup, error handling
  ├── config.js              Environment variables, rate limit config
  ├── db/                    Neo4j driver, initialization, seeding
  ├── middleware/            Auth, validation, rate limiting, logging
  ├── routes/                Auth, social, graph, messaging endpoints
  ├── services/              Business logic layer
  ├── validation/            Zod schemas for input validation
  └── lib/                   Utilities: logger, sanitizer, security
  
public/                       Frontend assets (HTML, CSS, JS)
docs/                         API specs, architecture decisions, diagrams
test/                         Unit and integration tests
scripts/                      Setup scripts, utilities
```

## Development

### Available Commands

```bash
# Development
npm run dev              # Start with hot-reload (uses nodemon)
npm start               # Start production server

# Testing & Quality
npm test                # Run all tests
npm run test:coverage   # Run tests with c8 coverage report
npm run lint            # ESLint validation
npm run check:status    # Repository self-check

# Database
npm run neo4j:setup     # Initialize Neo4j (Docker)
npm run neo4j:start     # Start Neo4j
npm run neo4j:stop      # Stop Neo4j
npm run seed:graph      # Seed demo data

# Docker
npm run docker:up       # Start app + Neo4j
npm run docker:down     # Stop containers

# Documentation
npm run report          # Generate report (Python)
```

### Hot-Reload Development
```bash
npm run dev
# File changes in src/ auto-reload the server
# Useful for rapid development iterations
```

### Testing

```bash
# Run all tests (60 tests)
npm test

# With c8 coverage report
npm run test:coverage

# Tests run against actual Neo4j instance
# Skip gracefully if database unavailable
```

**Test Coverage:**
- Unit tests: Validation, sanitization, pagination
- Integration tests: Auth flow, social routes, graph operations
- Security tests: CORS, CSP, authentication guards
- Service tests: Neo4j queries and relationships

## Project Report Generation

The `scripts/generate_report.py` script generates a comprehensive final project report (PowerPoint):

```bash
# Generate report from test results and code analysis
npm run report
```

**Report Contents:**
- Executive summary of project scope and objectives
- Architecture decisions and Neo4j graph design rationale
- Feature implementation details with code examples
- Security measures and vulnerability testing results
- Performance metrics and optimization strategies
- Test coverage statistics and CI/CD pipeline status
- Deployment instructions for production environments

**Output:** `docs/GraphLink_Gamma_Sunum_Turkce_fixed_working.pptx`

**Why Python?** The report generator uses Python's `python-pptx` library to create professional PowerPoint presentations from markdown content and test metrics. This allows automated documentation generation for presentations, grading, and stakeholder communication.

## API Documentation

### Available at `/docs` (when server running)

**Example Endpoints:**
```bash
# Authentication
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh

# Social
GET /api/users                    # List users (paginated)
GET /api/posts                    # List posts (paginated)
POST /api/posts                   # Create post
POST /api/posts/:id/like          # Like post
POST /api/users/:id/follow        # Follow user

# Graph
GET /api/graph/recommendations    # Recommend users/posts
GET /api/graph/network            # Get network for visualization
GET /api/graph/analytics          # Graph statistics
```

See [docs/API_ERRORS.md](docs/API_ERRORS.md) for error codes and responses.

## Deployment

### Docker

**Build Image:**
```bash
docker build -t graphlink-social:1.0.0 .
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEO4J_URI=bolt://neo4j:7687 \
  -e JWT_SECRET=your-secret-key \
  graphlink-social:1.0.0
```

### Docker Compose Production

See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- Kubernetes manifests
- Cloud platform guides (Railway, Render, Heroku)
- Neo4j Aura setup
- Health checks and monitoring
- Database backup/restore

### Environment Variables

```env
NODE_ENV=production
PORT=3000

# Neo4j
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=secure-password

# Security
JWT_SECRET=min-32-characters-long-secret-key
SESSION_SECRET=min-32-characters-long-secret

# Features
AUTO_SEED=false
```

See `.env.example` for all options.

## Documentation

| Document | Purpose |
|----------|---------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute, commit conventions, PR process |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards and reporting violations |
| [SECURITY.md](SECURITY.md) | Vulnerability disclosure, security hardening |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment guides (Docker/K8s/Cloud) |
| [CHANGELOG.md](CHANGELOG.md) | Version history and release notes |
| [docs/API_ERRORS.md](docs/API_ERRORS.md) | API error codes and response formats |
| [docs/openapi.yaml](docs/openapi.yaml) | OpenAPI 3.1 specification |

## Architecture Decisions

See [docs/adr/](docs/adr/) for Architecture Decision Records explaining:
- Graph database choice over relational
- JWT + refresh token strategy
- Cytoscape.js for visualization
- Neo4j Community Edition limitations

## Git Workflow

```bash
# Clone and setup
git clone https://github.com/Amir-Sheikhh/final-web-tasarim-project.git
cd final-web-tasarim-project
npm install

# Create feature branch
git checkout -b feature/your-feature

# Make changes, commit with conventional commits
git commit -m "feat(scope): description"

# Push and create PR
git push origin feature/your-feature
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Troubleshooting

### Neo4j Connection Issues
```bash
# Test connection
cypher-shell -a bolt://localhost:7687 "RETURN 1"

# Check environment
echo $NEO4J_URI
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Database Not Available
Tests auto-skip database tests if Neo4j unavailable. Unit tests still run.

## Performance Insights

- **Graph Queries:** Multi-hop traversals are O(n) in relationship count
- **Recommendations:** Uses Neo4j's pattern matching for efficient calculation
- **Pagination:** Limit/offset with indexes on creation timestamp
- **Rate Limiting:** Token bucket algorithm (memory-based)

## License

MIT - See [LICENSE](LICENSE) file

## Support

- 📖 Read [README](README.md) (Turkish version)
- 🐛 Report bugs via [GitHub Issues](.github/ISSUE_TEMPLATE/bug_report.md)
- 💡 Request features via [GitHub Issues](.github/ISSUE_TEMPLATE/feature_request.md)
- 🔐 Security issues: See [SECURITY.md](SECURITY.md)

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code quality standards
- Testing requirements
- Commit conventions
- PR process

## Acknowledgments

Built as a capstone project demonstrating:
- Graph database design patterns
- Full-stack Node.js development
- Security best practices
- Professional DevOps practices
- Test-driven development

---

**Made with ❤️ by Amir Sheikh**  
*Student ID: 24080410155*  
*Course: BMU1208 Web-Based Programming (Final Project)*
