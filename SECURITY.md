# Security Policy

## Supported Versions

| Version | Status | End of Life |
|---------|--------|------------|
| 1.3.x   | Active | 2027-05-20 |
| 1.0-1.2.x | Archived | 2026-05-20 |

## Reporting Security Vulnerabilities

**Do not** open public GitHub issues for security vulnerabilities. Instead, please email security reports to:

**Email:** laldinsheikh070@gmail.com

**Subject:** `[SECURITY] GraphLink Social Vulnerability Report`

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if applicable)
- Your contact information

## Response Timeline

We will:
1. **Acknowledge receipt** within 24 hours
2. **Confirm vulnerability** and assess severity within 48 hours
3. **Prepare fix** within 5-7 business days for critical issues
4. **Release patch** and notify you before public disclosure
5. **Credit** you in the security advisory (unless you prefer anonymity)

## Security Considerations

### Known Limitations

- **Neo4j Community Edition:** Single-instance database without clustering support. Use Neo4j Enterprise or cloud providers (Neo4j Aura) for production high-availability
- **No rate limiting on graph operations:** Graph queries can be resource-intensive; use configured rate limits
- **JavaScript frontend:** XSS prevention through HTML escaping, but not compiled to binary

### Best Practices for Deployment

1. **Environment Variables:** Never commit `.env` files; use GitHub Secrets or secure vaults
2. **Authentication:** Enforce HTTPS and use HttpOnly, Secure cookies
3. **Database:** Change default Neo4j password; use strong credentials
4. **CORS:** Configure to allow only trusted origins
5. **Rate Limiting:** Adjust thresholds based on your infrastructure
6. **Monitoring:** Log authentication events and suspicious activity
7. **Dependencies:** Regularly update with `npm audit` and `npm update`

### Implemented Security Measures

- ✅ Content Security Policy (CSP) - Prevents XSS attacks
- ✅ Helmet.js - Sets secure HTTP headers
- ✅ bcryptjs - Password hashing with salt
- ✅ JWT tokens - Secure session management
- ✅ HttpOnly cookies - Prevents JavaScript access to auth tokens
- ✅ Token rotation - Automatic refresh token handling
- ✅ Zod validation - Input validation for all endpoints
- ✅ HTML escaping - Prevents XSS in rendered content
- ✅ Rate limiting - Prevents brute-force attacks
- ✅ CORS validation - Restricts cross-origin requests

## Testing for Vulnerabilities

Run the following to check for known vulnerabilities:

```bash
npm audit
npm audit fix  # To auto-fix if possible
```

The CI/CD pipeline (`npm run test:coverage`) includes security checks.

## Public Disclosure

Once a patch is released and sufficient time has passed for users to upgrade (typically 30 days), we will publicly disclose the vulnerability and credit the reporter.

## Credits

Security improvements and vulnerability reports are greatly appreciated. Thank you for helping keep GraphLink Social secure!
