# Security Guide

Security features and best practices for the Home Assistant MCP server.

## Security Features

### Authentication & Authorization

The server uses token-based authentication:

- **Long-lived Access Tokens**: Secure tokens from Home Assistant
- **Token Validation**: Every request validates the token
- **Permission Scoping**: Respects Home Assistant's permission system

### Rate Limiting

Protection against abuse and DoS attacks:

```bash
# Enable rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100        # Max requests per window
RATE_LIMIT_WINDOW=60000   # Window in milliseconds
```

Configuration:
- Default: 100 requests per 60 seconds
- Configurable per deployment
- Automatic cleanup of expired entries

### Input Sanitization

Protection against injection attacks:

- XSS prevention
- SQL injection protection (if applicable)
- Command injection prevention
- Path traversal protection

### Security Headers

When running in HTTP mode:

- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)

## Best Practices

### Token Management

**Do:**
- ✅ Use unique tokens for each deployment
- ✅ Rotate tokens periodically
- ✅ Store tokens securely (environment variables)
- ✅ Use descriptive token names in Home Assistant

**Don't:**
- ❌ Share tokens between deployments
- ❌ Commit tokens to version control
- ❌ Use tokens with excessive permissions
- ❌ Leave default/example tokens

### Network Security

**Recommendations:**
- Use HTTPS for Home Assistant connections
- Run the server in a private network
- Use firewalls to restrict access
- Consider VPN for remote access

### Deployment Security

**Production checklist:**
- [ ] Debug mode disabled (`DEBUG=false`)
- [ ] Rate limiting enabled
- [ ] Strong authentication tokens
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Regular updates applied

### Access Control

**Principle of least privilege:**
1. Create dedicated Home Assistant user for MCP
2. Grant only necessary permissions
3. Use separate tokens for different purposes
4. Audit token usage regularly

## Threat Model

### Threats Addressed

1. **Unauthorized Access**: Token-based authentication
2. **Abuse/DoS**: Rate limiting
3. **Injection Attacks**: Input sanitization
4. **Man-in-the-Middle**: HTTPS support
5. **Token Theft**: Secure storage practices

### Threats to Consider

1. **Physical Access**: Secure the host system
2. **Network Attacks**: Use firewalls and VPNs
3. **Social Engineering**: User education
4. **Supply Chain**: Verify package integrity

## Security Updates

### Staying Secure

- Monitor security advisories
- Update dependencies regularly
- Subscribe to GitHub security alerts
- Review change logs for security fixes

### Reporting Vulnerabilities

If you discover a security issue:

1. **Don't** open a public issue
2. Email security concerns to the maintainers
3. Include detailed description and reproduction steps
4. Allow time for a fix before public disclosure

## Compliance

### Data Privacy

The server:
- Doesn't store user data
- Doesn't log sensitive information
- Respects Home Assistant's privacy settings
- Processes requests in memory only

### Audit Logging

Enable audit logging for compliance:

```bash
# Enable audit logs
AUDIT_LOG_ENABLED=true
AUDIT_LOG_PATH=/var/log/ha-mcp/audit.log
```

Logs include:
- Authentication attempts
- Command execution
- Rate limit violations
- Error conditions

## Security Checklist

### Initial Setup
- [ ] Generate unique access token
- [ ] Configure environment variables
- [ ] Enable rate limiting
- [ ] Disable debug mode
- [ ] Use HTTPS for Home Assistant

### Regular Maintenance
- [ ] Rotate access tokens (quarterly)
- [ ] Review audit logs
- [ ] Update dependencies
- [ ] Monitor security advisories
- [ ] Test backup procedures

### Incident Response
- [ ] Document security procedures
- [ ] Maintain contact information
- [ ] Practice incident response
- [ ] Have rollback plan ready

## Additional Resources

- [Home Assistant Security](https://www.home-assistant.io/docs/configuration/securing/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Configuration Guide](CONFIGURATION.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)

## Questions?

For security-related questions:
- Review this guide thoroughly
- Check the [FAQ](FAQ.md)
- Contact the maintainers privately for sensitive issues
