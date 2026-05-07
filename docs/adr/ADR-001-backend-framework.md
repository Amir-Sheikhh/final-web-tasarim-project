# ADR-001: Keep Express Backend

Status: Accepted

Date: 2026-04-30

## Context

The project template mentions Node.js + Fastify, but the existing application already had a working Express server with auth, middleware, static serving, route modules, and tests.

## Decision

Keep Express and document the difference clearly instead of rewriting the backend framework late in the project.

## Consequences

This preserves working code and reduces delivery risk. The trade-off is that the report must explicitly state Express was selected instead of Fastify.
