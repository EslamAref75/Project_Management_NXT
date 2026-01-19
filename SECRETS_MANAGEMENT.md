# Secrets Management Guide

## Overview
This document explains how to manage secrets (API keys, database credentials, authentication tokens) across different environments in the Project Management System.

## Critical Secrets

### NEXTAUTH_SECRET
- **Purpose**: NextAuth.js uses this to encrypt sessions and tokens
- **Format**: 64-character hexadecimal string (32 bytes)
- **Generation**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **Rotation**: Required when rotating sessions (at minimum every 90 days)
- **Environment Specific**: Use different secrets for dev, staging, and production

### DATABASE_URL
- **Purpose**: Connection string for Prisma ORM to connect to SQLite database
- **Format**: `file:./path/to/database.db` for SQLite
- **Location**: `.env.local` (local dev) and CI/CD secrets (production)
- **Security**: Ensure database file permissions restrict access (chmod 600)

## Environment Setup

### Local Development
1. Copy `.env.example` to `.env.local`
2. Generate a new NEXTAUTH_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Update `NEXTAUTH_SECRET` in `.env.local` with generated value
4. Restart dev server: `npm run dev`

### Staging Environment
1. Create `.env.staging` with staging-specific values
2. Generate a unique NEXTAUTH_SECRET (different from development)
3. Use read-only database credentials when possible
4. Document all secrets in your CI/CD platform (GitHub Secrets, GitLab Variables, etc.)

### Production Environment
1. **Never** commit `.env.local` or any `.env` files to version control
2. Use platform secrets management:
   - **Vercel**: Project Settings → Environment Variables
   - **AWS**: Secrets Manager or Parameter Store
   - **Docker**: Use Docker secrets or volume mounts
3. Generate a production-specific NEXTAUTH_SECRET
4. Use encrypted database connection strings
5. Enable HTTPS and set `NEXTAUTH_SECURE_COOKIE=true`
6. Rotate secrets every 90 days minimum

## Security Best Practices

### ✅ DO
- Generate secrets using cryptographic functions (`crypto.randomBytes()`)
- Use different secrets for each environment
- Rotate secrets regularly (minimum 90 days)
- Store secrets in dedicated secret management systems
- Audit access to secrets
- Use short-lived secrets where possible
- Document secret purpose and rotation schedule

### ❌ DON'T
- Commit secrets to version control (even in `.gitignore` files)
- Share secrets via email, Slack, or unencrypted channels
- Use the same secret across multiple environments
- Use weak or predictable secrets
- Hardcode secrets in source code
- Log or expose secrets in error messages
- Keep secrets in plaintext files on servers

## Rotation Procedure

### When to Rotate
- Immediately if leaked or compromised
- Quarterly (every 90 days) as part of security policy
- When team member departs
- After security audit
- When updating authentication libraries

### How to Rotate NEXTAUTH_SECRET
1. Generate new secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Update environment variable in secret management system
3. Restart application/deployment
4. All existing sessions will be invalidated (users re-login)
5. Document rotation in audit log

### Session Invalidation
When NEXTAUTH_SECRET changes:
- All active sessions become invalid
- Users automatically redirected to login
- No user data loss
- Consider timing rotation to off-hours

## Verification Checklist

- [ ] `.env.local` is in `.gitignore` and never committed
- [ ] All secrets use strong, random values (32+ bytes)
- [ ] Different secrets used for dev/staging/production
- [ ] Secrets rotated within past 90 days
- [ ] HTTPS enabled in production (NEXTAUTH_SECURE_COOKIE=true)
- [ ] No hardcoded secrets in source code (grep check: `grep -r "secret\|password\|key" src/ --include="*.ts" --include="*.tsx"`)
- [ ] Secrets stored in proper CI/CD secret management
- [ ] Database credentials use least-privilege access
- [ ] Audit logging enabled for secret access
- [ ] Incident response plan documented for secret leaks

## Monitoring & Auditing

### Check for Hardcoded Secrets
```bash
# Search for common secret patterns
grep -r "secret.*=" src/ --include="*.ts" --include="*.tsx"
grep -r "password.*=" src/ --include="*.ts" --include="*.tsx"
grep -r "api.*key" src/ --include="*.ts" --include="*.tsx"
```

### Monitor Secret Access
- Enable audit logs in your secret management platform
- Alert on secret access by unexpected users/services
- Review rotation history monthly
- Monitor failed authentication attempts

## Incident Response

If a secret is compromised:
1. **Immediate**: Rotate the secret
2. **Investigation**: Determine scope and exposure duration
3. **Notification**: Alert relevant stakeholders
4. **Remediation**: Check logs for unauthorized access
5. **Documentation**: Record incident and remediation steps
6. **Prevention**: Implement controls to prevent recurrence

## References
- [NextAuth.js Configuration Docs](https://next-auth.js.org/getting-started/example)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
