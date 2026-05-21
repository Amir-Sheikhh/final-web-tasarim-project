# Contributing to GraphLink Social

Thank you for your interest in contributing to GraphLink Social! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please review our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating in this project.

## Getting Started

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/final-web-tasarim-project.git
   cd final-web-tasarim-project
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Neo4j**
   ```bash
   # Using Docker Compose (recommended)
   npm run docker:up
   
   # Or manually setup Neo4j:
   npm run neo4j:setup
   npm run neo4j:start
   ```

4. **Configure Environment**
   ```bash
   cp .env.example .env
   # Update .env with your local configuration
   ```

5. **Seed Database**
   ```bash
   npm run seed:graph
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming
Use descriptive branch names following this pattern:
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

Optional longer explanation of changes.
Fixes #123
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `security`

**Examples:**
```
feat(auth): add refresh token rotation
fix(graph): handle circular relationships in recommendations
docs: update deployment guide
test(social): add negative path coverage
security: tighten CSP script policy
```

### Code Quality Standards

All code must pass before submission:

```bash
npm run lint        # ESLint checks
npm test            # All tests pass
npm run test:coverage  # Coverage meets thresholds (80% lines, 75% functions/branches)
npm run check:status   # Repository validation
```

## Making a Pull Request

1. **Ensure all quality gates pass:**
   ```bash
   npm run lint
   npm run test:coverage
   npm run check:status
   ```

2. **Push your branch:**
   ```bash
   git push origin feature/your-feature
   ```

3. **Create a Pull Request:**
   - Use a clear, descriptive title
   - Reference any related issues (#123)
   - Ensure your PR passes all CI checks
   - Request review from maintainers

4. **PR Checklist:**
   - [ ] Tests written for new functionality
   - [ ] Existing tests pass
   - [ ] Code coverage meets thresholds
   - [ ] Documentation updated if needed
   - [ ] No console.logs or debug code left
   - [ ] Commit messages follow conventions

## Testing Guidelines

### Running Tests

```bash
npm test                  # Run all tests
npm run test:coverage     # Run tests with coverage report
```

### Writing Tests

- Place test files in `test/` directory
- Use Node.js built-in `node --test` runner
- Use Supertest for HTTP testing
- Test both happy paths and error cases
- Aim for descriptive test names

**Example:**
```javascript
test('auth: should reject invalid credentials', async (t) => {
  const res = await request(app)
    .post('/auth/login')
    .send({ email: 'test@example.com', password: 'wrong' });
  
  assert.equal(res.status, 401);
  assert.match(res.body.error, /invalid credentials/i);
});
```

## Security

- Never commit `.env` or secrets
- Report security vulnerabilities in `SECURITY.md`
- Use environment variables for sensitive data
- Validate all user input with Zod schemas
- Follow OWASP guidelines

## Documentation

- Update README.md for user-facing changes
- Add comments only for non-obvious logic
- Keep docs in sync with code
- Use clear, concise language

## Getting Help

- Check [README.md](README.md) for overview
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for deployment
- See [docs/](docs/) for architecture and API documentation
- Open an issue for questions

## Release Process

Releases follow semantic versioning and are managed by maintainers. Ensure your PR includes:
- Clear description of changes
- Any breaking changes noted
- Updated CHANGELOG.md (maintainers may do this)

## Recognition

Contributors will be recognized in:
- Git commit history
- Project README (for significant contributions)
- Release notes

Thank you for contributing! 🙏
