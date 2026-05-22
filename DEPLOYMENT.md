# Deployment Guide

This guide covers deploying GraphLink Social to various environments.

## Local Development

### Quick Start with Docker Compose

```bash
npm install
npm run docker:up
```

This starts:
- Express app on `http://localhost:3000`
- Neo4j Browser on `http://localhost:7474`
- Neo4j Bolt on `bolt://localhost:7687`

Access with:
- **App:** http://localhost:3000
- **Neo4j:** http://localhost:7474 (auth: none by default)
- **API Docs:** http://localhost:3000/api/docs

### Manual Local Setup

```bash
# Install dependencies
npm install

# Setup Neo4j (requires Docker installed)
npm run neo4j:setup
npm run neo4j:start

# Configure environment
cp .env.example .env
# Edit .env with your local settings

# Seed database
npm run seed:graph

# Start development server
npm run dev
```

## Environment Variables

Required environment variables (see `.env.example`):

```env
# Server
NODE_ENV=development
PORT=3000

# Neo4j Database
NEO4J_URI=bolt://localhost:7687
NEO4J_AUTH_DISABLED=false
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=yourpassword

# Security
JWT_SECRET=your-very-secret-key-min-32-chars
SESSION_SECRET=your-session-secret-min-32-chars

# Features
AUTO_SEED=true  # Auto-seed database on startup
```

## Production Deployment

### Docker Image Build

```bash
docker build -t graphlink-social:1.0.0 .
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEO4J_URI=bolt://neo4j-server:7687 \
  -e NEO4J_USER=neo4j \
  -e NEO4J_PASSWORD=secure-password \
  -e JWT_SECRET=production-secret-key \
  graphlink-social:1.0.0
```

### Docker Compose Production

Use `docker-compose.yml` as base:

```yaml
version: '3.8'

services:
  app:
    build: .
    environment:
      NODE_ENV: production
      NEO4J_URI: bolt://neo4j:7687
      NEO4J_USER: neo4j
      NEO4J_PASSWORD: ${NEO4J_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      neo4j:
        condition: service_healthy

  neo4j:
    image: neo4j:5-enterprise  # Use Enterprise for HA
    environment:
      NEO4J_AUTH: neo4j/${NEO4J_PASSWORD}
    ports:
      - "7687:7687"
    volumes:
      - neo4j-data:/var/lib/neo4j/data
    healthcheck:
      test: ["CMD", "cypher-shell", "-a", "bolt://localhost:7687", "RETURN 1"]
      interval: 10s
      timeout: 5s
      retries: 12

volumes:
  neo4j-data:
```

### Security Checklist for Production

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, random JWT_SECRET and SESSION_SECRET (min 32 characters)
- [ ] Enable Neo4j authentication (change default password)
- [ ] Use HTTPS (SSL/TLS certificate)
- [ ] Configure CORS for allowed origins only
- [ ] Set secure cookies: `COOKIE_SECURE=true`
- [ ] Use rate limiting appropriate for your scale
- [ ] Enable Neo4j Enterprise or cloud provider for HA
- [ ] Setup monitoring and logging
- [ ] Regular database backups
- [ ] Keep dependencies updated

## Cloud Deployment

### Neo4j Aura (Recommended)

1. Create Neo4j Aura instance at https://console.neo4j.io
2. Copy connection string and credentials
3. Set environment variables:
   ```env
   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=yourpassword
   ```

### Railway, Render, or Heroku

1. Connect Git repository
2. Set environment variables in platform dashboard
3. Deploy with buildpack or Dockerfile:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json .
   RUN npm ci --only=production
   COPY src ./src
   COPY public ./public
   EXPOSE 3000
   CMD ["node", "src/server.js"]
   ```

### Kubernetes

Example deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: graphlink-social
spec:
  replicas: 3
  selector:
    matchLabels:
      app: graphlink-social
  template:
    metadata:
      labels:
        app: graphlink-social
    spec:
      containers:
      - name: app
        image: graphlink-social:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: NEO4J_URI
          valueFrom:
            secretKeyRef:
              name: neo4j-secret
              key: uri
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

## Health Checks

The app exposes a health check endpoint:

```bash
curl http://localhost:3000/health
# Response: { "status": "ok" }
```

Use this for load balancers and orchestration platforms.

## Monitoring

### Application Logs

Logs are output in JSON format for easy parsing:

```bash
curl http://localhost:3000/health | jq .
```

Log levels: `info`, `warn`, `error`

### Metrics

Available at `/monitoring/status`:

```bash
curl http://localhost:3000/monitoring/status
```

### Database Monitoring

Neo4j browser: http://neo4j-server:7474

Query statistics and performance can be monitored through Neo4j's built-in tools.

## Backup & Restore

### Neo4j Backup

```bash
# Using neo4j-admin (requires local access)
neo4j-admin database dump neo4j --to-path=/backups/

# Using dump queries
CALL apoc.export.json.all('backup.json', {})
```

### Restore

```bash
CALL apoc.import.json('backup.json', {})
```

## Version Updates

### Updating Node.js

Update `package.json` to new LTS version and redeploy.

### Updating Dependencies

```bash
npm update
npm audit fix
npm test
# Deploy after passing tests
```

### Rolling Updates (Kubernetes)

```bash
kubectl set image deployment/graphlink-social \
  graphlink-social=graphlink-social:1.1.0 \
  --record
```

## Troubleshooting

### Cannot connect to Neo4j

```bash
# Check connection string
echo $NEO4J_URI

# Test with cypher-shell
cypher-shell -a $NEO4J_URI "RETURN 1"
```

### Authentication errors

- Verify JWT_SECRET is set and consistent
- Check token expiration times
- Review CORS configuration

### High memory usage

- Check for unbounded queries
- Review Neo4j heap settings
- Monitor Node.js memory with `node --max-old-space-size=4096`

## Support

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to report issues and get help.
