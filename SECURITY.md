# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x | Yes |

## Reporting a Vulnerability

Please **do not** report security vulnerabilities through public GitHub Issues.

Instead, email: **security@mailforge.local** (replace with your actual contact)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for a fix.

## Security Measures

- SMTP passwords are encrypted at rest with AES-256-GCM
- JWT access tokens expire in 15 minutes
- Refresh tokens are stored as bcrypt hashes
- All API routes require authentication by default (`@Public()` required to opt out)
- Role-based access control enforced at controller level
- Input validation via class-validator on all DTOs
- Helmet.js headers enabled
- Rate limiting via ThrottlerModule
- CORS restricted to configured frontend URL
- SQL injection prevented by Prisma ORM parameterized queries
- File uploads validated for type and size

## Known Limitations

- The tracking endpoints (`/t/*`) are intentionally public and unauthenticated
- The unsubscribe endpoint is intentionally public to comply with email laws
- File uploads are stored on the local filesystem — consider S3/MinIO for production
