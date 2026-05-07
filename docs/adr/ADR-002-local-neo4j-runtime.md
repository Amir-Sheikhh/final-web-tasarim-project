# ADR-002: Use Local Neo4j Runtime

Status: Accepted

Date: 2026-04-30

## Context

The application needs Neo4j, APOC, and Graph Data Science for the required graph algorithms. Cloud services would add account and network dependencies during final evaluation.

## Decision

Use a project-local Neo4j Community runtime managed by PowerShell setup/start/stop scripts.

## Consequences

The project can be demonstrated offline on Windows after setup. The trade-off is that non-Windows environments need script adaptation.
