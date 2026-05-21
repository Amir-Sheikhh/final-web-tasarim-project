# API Error Codes & Responses

This document describes the error response format and error codes returned by GraphLink Social API endpoints.

## Error Response Format

All API errors return JSON responses with the following structure:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  },
  "requestId": "uuid-for-debugging"
}
```

## HTTP Status Codes

| Code | Meaning | Cause |
|------|---------|-------|
| 400 | Bad Request | Invalid input, missing required fields, validation failed |
| 401 | Unauthorized | Invalid credentials, token missing, token expired |
| 403 | Forbidden | Insufficient permissions, access denied by role |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists, duplicate entry |
| 422 | Unprocessable Entity | Invalid data format or business logic violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error, unexpected condition |
| 503 | Service Unavailable | Database unavailable, server overloaded |

## Common Error Codes

### Authentication Errors (401)

**Invalid Credentials**
```json
{
  "error": "Invalid email or password",
  "code": "INVALID_CREDENTIALS"
}
```

**Missing Token**
```json
{
  "error": "Authorization token required",
  "code": "TOKEN_REQUIRED"
}
```

**Expired Token**
```json
{
  "error": "Token has expired",
  "code": "TOKEN_EXPIRED"
}
```

**Invalid Token Format**
```json
{
  "error": "Invalid token format",
  "code": "INVALID_TOKEN_FORMAT"
}
```

### Authorization Errors (403)

**Access Denied**
```json
{
  "error": "You do not have permission to access this resource",
  "code": "ACCESS_DENIED"
}
```

**Role Required**
```json
{
  "error": "This action requires admin role",
  "code": "INSUFFICIENT_ROLE"
}
```

### Validation Errors (400, 422)

**Invalid Input**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Must be a valid email address",
    "password": "Must be at least 8 characters"
  }
}
```

**Missing Required Field**
```json
{
  "error": "Missing required fields",
  "code": "REQUIRED_FIELD_MISSING",
  "details": {
    "email": "Email is required"
  }
}
```

**Invalid Format**
```json
{
  "error": "Invalid data format",
  "code": "INVALID_FORMAT",
  "details": {
    "age": "Must be a number"
  }
}
```

### Resource Errors (404, 409)

**Not Found**
```json
{
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```

**Resource Already Exists**
```json
{
  "error": "Email already registered",
  "code": "EMAIL_EXISTS"
}
```

**Duplicate Entry**
```json
{
  "error": "You have already liked this post",
  "code": "ALREADY_LIKED"
}
```

### Rate Limiting (429)

**Rate Limit Exceeded**
```json
{
  "error": "Too many requests, please try again later",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

**Retry After**
```
Retry-After: 60
```

### Server Errors (500, 503)

**Internal Server Error**
```json
{
  "error": "An unexpected error occurred",
  "code": "INTERNAL_ERROR",
  "requestId": "uuid-for-support"
}
```

**Service Unavailable**
```json
{
  "error": "Database is temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE"
}
```

## Error Code Reference

| Code | HTTP | Meaning |
|------|------|---------|
| INVALID_CREDENTIALS | 401 | Wrong email or password |
| TOKEN_REQUIRED | 401 | Authorization token missing |
| TOKEN_EXPIRED | 401 | Token has expired |
| INVALID_TOKEN_FORMAT | 401 | Malformed token |
| ACCESS_DENIED | 403 | User lacks permission |
| INSUFFICIENT_ROLE | 403 | Required role not met |
| VALIDATION_ERROR | 400 | Input validation failed |
| REQUIRED_FIELD_MISSING | 400 | Required field absent |
| INVALID_FORMAT | 422 | Data format invalid |
| USER_NOT_FOUND | 404 | User does not exist |
| POST_NOT_FOUND | 404 | Post does not exist |
| EMAIL_EXISTS | 409 | Email already registered |
| ALREADY_LIKED | 409 | Already liked this resource |
| ALREADY_FOLLOWING | 409 | Already following user |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error occurred |
| SERVICE_UNAVAILABLE | 503 | Database unavailable |

## Debugging with Request ID

Each error response includes a `requestId` field. Use this ID to:
1. Check server logs: `grep requestId server.log`
2. Report issues: Include the requestId in bug reports
3. Track errors: Correlate client and server logs

## Example Error Handling

### JavaScript/Fetch

```javascript
async function login(email, password) {
  const res = await fetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const error = await res.json();
    console.error(`[${error.code}] ${error.error}`);
    
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      // Wait and retry
      const retryAfter = res.headers.get('Retry-After');
      setTimeout(() => login(email, password), retryAfter * 1000);
    }
  }
}
```

### Error Recovery Strategies

1. **Validation Errors (400):** Fix input and retry immediately
2. **Auth Errors (401):** Refresh token or re-login
3. **Permission Errors (403):** Display permission denied message
4. **Rate Limit (429):** Exponential backoff with Retry-After header
5. **Server Errors (500):** Retry with backoff, show user-friendly message

## Monitoring

Monitor error rates using the logging system:

```bash
# View errors in real-time
tail -f server.log | grep '"error"'

# Count error codes
grep '"code"' server.log | jq -r '.code' | sort | uniq -c
```
