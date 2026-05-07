# ADR-003: JWT Access Token With HttpOnly Refresh Cookie

Status: Accepted

Date: 2026-05-01

## Context

The project requires authenticated REST endpoints and a logout flow. Browser storage would increase exposure if XSS occurs.

## Decision

Use a short-lived JWT access token and a refresh token stored in HttpOnly cookies. Store hashed refresh sessions in Neo4j so logout and rotation can revoke sessions.

## Consequences

The app gets simple stateless request authentication plus server-side revocation for refresh sessions. Cookie and token lifetimes must be maintained consistently.
