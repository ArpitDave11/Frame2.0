# Template Feedback: api_specification (10 rounds)

## Key Structural Changes
- Webhooks & Events: optional → required (event delivery is core, not optional)
- Idempotency: optional → required
- Versioning & Deprecation: optional → required
- New sections: Security Considerations, Async Job Patterns

## Top Issues
- Endpoints hint doesn't handle GET query params vs POST bodies (10/10)
- Data Models: no nested object guidance (6/10)
- Error Handling: no error envelope schema example (7/10)
- Pagination too short (100 words) for cursor semantics (5/10)
- Webhooks optional = skipped for event-driven APIs (4/10)
