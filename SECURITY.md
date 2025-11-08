# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :x:                |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Home Assistant MCP seriously. If you discover a security vulnerability, please follow these steps:

### 🔒 Private Disclosure

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please report security issues via:

1. **GitHub Security Advisories** (Preferred)
   - Navigate to the [Security tab](https://github.com/jango-blockchained/advanced-homeassistant-mcp/security)
   - Click "Report a vulnerability"
   - Fill in the details

2. **Direct Contact**
   - Contact the maintainers directly through GitHub
   - Include "SECURITY" in the subject line

### 📋 What to Include

Please provide:

- **Description**: Clear description of the vulnerability
- **Impact**: What could an attacker do?
- **Reproduction Steps**: How to reproduce the issue
- **Environment**: Versions, configurations, etc.
- **Proof of Concept**: Code or steps demonstrating the issue (if applicable)
- **Suggested Fix**: If you have ideas for a fix (optional)

### ⏱️ Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Status Updates**: Every 7 days until resolved
- **Fix Timeline**: Depends on severity (see below)

### 🎯 Severity Levels

| Severity | Response Time | Example |
|----------|--------------|---------|
| **Critical** | 24-48 hours | Remote code execution, authentication bypass |
| **High** | 1 week | SQL injection, privilege escalation |
| **Medium** | 2-4 weeks | XSS, information disclosure |
| **Low** | 4-8 weeks | Minor information leaks |

## Security Best Practices

### For Users

#### 🔐 Token Security

- **Never commit tokens** to version control
- **Use unique tokens** for each deployment
- **Rotate tokens** regularly (quarterly recommended)
- **Use descriptive names** for tokens in Home Assistant
- **Store tokens securely** in environment variables or secret managers

#### 🌐 Network Security

- **Use HTTPS** for all Home Assistant connections
- **Run behind a firewall** when possible
- **Use VPN** for remote access
- **Restrict network access** to trusted sources
- **Keep software updated** (Bun, Node.js, dependencies)

#### 🛡️ Deployment Security

Production checklist:

- [ ] Debug mode disabled (`DEBUG=false`)
- [ ] Rate limiting enabled and configured
- [ ] Strong authentication tokens in use
- [ ] HTTPS enabled for Home Assistant
- [ ] Security headers configured (in HTTP mode)
- [ ] Regular updates applied
- [ ] Audit logging enabled (if required)

### For Developers

#### 🔒 Secure Coding Practices

- **Input Validation**: Sanitize all user inputs
- **Output Encoding**: Prevent XSS attacks
- **Parameterized Queries**: Prevent SQL injection
- **Least Privilege**: Run with minimal permissions
- **Secure Dependencies**: Keep dependencies updated
- **Secret Management**: Never hardcode secrets

#### 🧪 Security Testing

- Run tests before committing: `bun test`
- Enable security scanning in CI/CD
- Review dependency vulnerabilities regularly
- Perform security audits for major releases
- Test authentication and authorization flows

## Security Features

### Built-in Protections

#### Authentication & Authorization

- Token-based authentication via Home Assistant
- Token validation on every request
- Permission scoping from Home Assistant

#### Rate Limiting

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100        # Requests per window
RATE_LIMIT_WINDOW=60000   # Window in milliseconds
```

#### Input Sanitization

- XSS prevention on all inputs
- Command injection protection
- Path traversal protection
- SQL injection protection (where applicable)

#### Security Headers (HTTP Mode)

- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)
- X-XSS-Protection

## Vulnerability Disclosure Policy

### Our Commitment

- We will respond promptly to security reports
- We will keep you informed of progress
- We will credit you in release notes (unless you prefer to remain anonymous)
- We will not take legal action against security researchers acting in good faith

### Safe Harbor

We consider security research and vulnerability disclosure activities conducted in accordance with this policy to be:

- Authorized concerning any applicable anti-hacking laws
- Exempt from any restrictions in our Terms of Service
- Lawful and helpful to the overall security of the Internet

### Out of Scope

The following are **not** considered vulnerabilities:

- Denial of Service (DoS) attacks
- Social engineering attacks
- Physical attacks
- Issues requiring unlikely user interaction
- Issues in outdated/unsupported versions
- Issues with no security impact
- Rate limiting bypasses without security impact
- Missing security headers without demonstrated impact

## Security Updates

### Staying Informed

- Watch this repository for security advisories
- Subscribe to [GitHub Security Advisories](https://github.com/jango-blockchained/advanced-homeassistant-mcp/security/advisories)
- Check [CHANGELOG.md](CHANGELOG.md) for security fixes
- Review [Releases](https://github.com/jango-blockchained/advanced-homeassistant-mcp/releases) for security patches

### Update Process

1. **Check Version**: `npm show @jango-blockchained/homeassistant-mcp version`
2. **Update Package**: `bun update @jango-blockchained/homeassistant-mcp`
3. **Test Changes**: Verify functionality after updating
4. **Monitor Logs**: Check for any issues post-update

## Additional Resources

- [Home Assistant Security](https://www.home-assistant.io/docs/configuration/securing/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Security Guide](docs/SECURITY.md) - Detailed security documentation
- [Configuration Guide](docs/CONFIGURATION.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Questions?

For general security questions (not vulnerabilities):

- Check the [Security Guide](docs/SECURITY.md)
- Review the [FAQ](docs/FAQ.md)
- Ask in [GitHub Discussions](https://github.com/jango-blockchained/advanced-homeassistant-mcp/discussions)

For security vulnerabilities, **always use private disclosure methods** described above.

---

**Thank you for helping keep Home Assistant MCP and our users safe!** 🛡️
