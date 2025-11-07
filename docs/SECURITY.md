# 🔒 Security Guide

Comprehensive security guide for Home Assistant MCP server. Learn best practices for securing your smart home integration.

## 📋 Table of Contents

- [Security Overview](#security-overview)
- [Authentication & Authorization](#authentication--authorization)
- [Network Security](#network-security)
- [Data Protection](#data-protection)
- [Secure Configuration](#secure-configuration)
- [Monitoring & Auditing](#monitoring--auditing)
- [Incident Response](#incident-response)
- [Security Checklist](#security-checklist)

---

## Security Overview

### Security Architecture

```
┌─────────────────────────────────────────────────┐
│            AI Assistant (Claude, etc.)          │
│         Runs on user's local machine            │
└────────────────┬────────────────────────────────┘
                 │ MCP Protocol (stdio/encrypted)
┌────────────────▼────────────────────────────────┐
│          Home Assistant MCP Server              │
│  ┌──────────────────────────────────────────┐  │
│  │  Security Layers:                        │  │
│  │  1. Input Validation & Sanitization     │  │
│  │  2. Rate Limiting                        │  │
│  │  3. Authentication (JWT + HA Token)      │  │
│  │  4. Authorization                        │  │
│  │  5. Encryption (HTTPS/TLS)              │  │
│  │  6. Audit Logging                        │  │
│  └──────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────┘
                 │ HTTPS/TLS (recommended)
┌────────────────▼────────────────────────────────┐
│         Home Assistant Instance                 │
│      Contains all smart home devices            │
└─────────────────────────────────────────────────┘
```

### Built-in Security Features

✅ **Authentication**
- Home Assistant long-lived access tokens
- JWT token support
- Secure token storage

✅ **Input Validation**
- Schema validation with Valibot
- Type checking with TypeScript
- HTML sanitization

✅ **Rate Limiting**
- Configurable request limits
- Per-client tracking
- DDoS protection

✅ **Encryption**
- HTTPS/TLS support
- Secure communication channels
- Certificate validation

✅ **Security Headers**
- Helmet.js integration
- CORS configuration
- CSP policies

✅ **Audit Logging**
- Request/response logging
- Error tracking
- Security event logging

---

## Authentication & Authorization

### Home Assistant Tokens

**Creating Secure Tokens**:

1. **Use dedicated tokens**:
   - Don't use admin user's token
   - Create user specific for MCP
   - Limit permissions if possible

2. **Token creation**:
   ```
   Home Assistant → Profile → Long-Lived Access Tokens
   → Create Token → Name: "MCP Server (Limited)"
   ```

3. **Secure storage**:
   ```env
   # .env file (NEVER commit to git)
   HOME_ASSISTANT_TOKEN=eyJ0eXAiOiJKV1Qi...
   ```

4. **Environment variables** (preferred):
   ```bash
   export HOME_ASSISTANT_TOKEN=eyJ0eXAiOiJKV1Qi...
   ```

**Token Security Best Practices**:

```bash
# ✅ Good - Environment variable
export HA_TOKEN=$(cat /secure/location/token.txt)

# ✅ Good - Secrets manager
HA_TOKEN=$(aws secretsmanager get-secret-value --secret-id ha-token)

# ❌ Bad - Hardcoded
HOME_ASSISTANT_TOKEN=eyJ0eXAiOiJKV1Qi...

# ❌ Bad - Committed to git
git add .env
```

### JWT Authentication

**Configure JWT Secret**:

```env
# Generate strong secret
JWT_SECRET=$(openssl rand -base64 32)

# Or
JWT_SECRET=your-super-secret-key-min-32-characters-long

# Configuration
JWT_EXPIRATION=24h
JWT_ALGORITHM=HS256
```

**Best Practices**:

1. **Strong secrets**:
   ```bash
   # Generate cryptographically secure secret
   openssl rand -base64 32
   ```

2. **Regular rotation**:
   - Rotate JWT secret every 90 days
   - Update in all environments
   - Invalidates old tokens

3. **Short expiration**:
   ```env
   JWT_EXPIRATION=24h  # Not 30d or never
   ```

### Authorization Levels

**User Permissions in Home Assistant**:

```yaml
# Create restricted user for MCP
users:
  - username: mcp_server
    password: ...
    group_id: mcp_users
    
# Configure group permissions
groups:
  - id: mcp_users
    name: MCP Server Users
    policy:
      entities:
        # Allow specific domains
        - domain: light
        - domain: switch
        - domain: climate
        # Deny sensitive domains
        - domain: lock
          deny: true
```

---

## Network Security

### HTTPS/TLS Configuration

**Enable HTTPS**:

```env
HTTPS_ENABLED=true
SSL_CERT_PATH=/etc/ssl/certs/homeassistant-mcp.crt
SSL_KEY_PATH=/etc/ssl/private/homeassistant-mcp.key
SSL_CA_PATH=/etc/ssl/certs/ca-bundle.crt  # Optional
```

**Generate Self-Signed Certificate** (development):

```bash
openssl req -x509 -newkey rsa:4096 \
  -keyout key.pem -out cert.pem \
  -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Org/CN=localhost"
```

**Let's Encrypt Certificate** (production):

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone \
  -d homeassistant.example.com

# Configure
SSL_CERT_PATH=/etc/letsencrypt/live/homeassistant.example.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/homeassistant.example.com/privkey.pem
```

**TLS Configuration**:

```env
# Strong ciphers only
SSL_CIPHERS=ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384

# TLS 1.2 minimum
SSL_MIN_VERSION=TLSv1.2

# Prefer server ciphers
SSL_PREFER_SERVER_CIPHERS=true
```

### Firewall Configuration

**Allow only necessary ports**:

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 8123/tcp    # Home Assistant
sudo ufw deny 4000/tcp     # MCP server (internal only)
sudo ufw enable

# iptables
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 8123 -j ACCEPT
iptables -A INPUT -p tcp --dport 4000 -j DROP
```

**VPN Access** (recommended):

```bash
# Use VPN for remote access instead of exposing ports
# WireGuard example
sudo apt install wireguard
# Configure WireGuard...
```

### CORS Configuration

**Restrict origins**:

```env
# Specific origins only
CORS_ORIGINS=https://app.example.com,https://backup.example.com

# Development (localhost)
CORS_ORIGINS=http://localhost:3000

# ❌ Avoid in production
CORS_ORIGINS=*
```

**CORS headers**:

```typescript
// Secure CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(','),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 600  // 10 minutes
};
```

---

## Data Protection

### Input Sanitization

**Automatic sanitization**:

```typescript
import sanitize from 'sanitize-html';

// All input automatically sanitized
const cleanInput = sanitize(userInput, {
  allowedTags: [],
  allowedAttributes: {}
});
```

**Validation schemas**:

```typescript
import * as v from 'valibot';

// Input validation
const LightParamsSchema = v.object({
  entity_id: v.pipe(
    v.string(),
    v.regex(/^light\.[a-z0-9_]+$/)
  ),
  brightness: v.optional(
    v.pipe(v.number(), v.minValue(0), v.maxValue(255))
  )
});
```

### Data Encryption

**Environment variables**:

```bash
# Encrypt sensitive data
echo "my_token" | openssl enc -aes-256-cbc -salt -out token.enc

# Decrypt when needed
export HA_TOKEN=$(openssl enc -aes-256-cbc -d -in token.enc)
```

**At rest** (optional):

```env
# Encrypt logs
LOG_ENCRYPTION=true
LOG_ENCRYPTION_KEY=/path/to/encryption.key

# Encrypt cache
CACHE_ENCRYPTION=true
```

**In transit**:

```env
# Always use HTTPS for Home Assistant
HOME_ASSISTANT_URL=https://homeassistant.example.com

# Enable HTTPS for MCP server
HTTPS_ENABLED=true
```

### Secrets Management

**Using environment variables**:

```bash
# Load from secure file
set -a
source /secure/path/.env.secret
set +a
```

**Using secrets manager** (AWS example):

```bash
# Store secret
aws secretsmanager create-secret \
  --name homeassistant-mcp/token \
  --secret-string "eyJ0eXAiOiJKV1Qi..."

# Retrieve secret
HA_TOKEN=$(aws secretsmanager get-secret-value \
  --secret-id homeassistant-mcp/token \
  --query SecretString \
  --output text)
```

**Using HashiCorp Vault**:

```bash
# Write secret
vault kv put secret/homeassistant-mcp \
  token="eyJ0eXAiOiJKV1Qi..."

# Read secret
export HA_TOKEN=$(vault kv get \
  -field=token secret/homeassistant-mcp)
```

---

## Secure Configuration

### Production Configuration

```env
# =====================================
# Secure Production Configuration
# =====================================

# Home Assistant (HTTPS only)
HOME_ASSISTANT_URL=https://homeassistant.example.com
HOME_ASSISTANT_TOKEN=${HA_TOKEN}  # From secrets manager

# Server
NODE_ENV=production
PORT=4000
HOST=127.0.0.1  # Local only (behind reverse proxy)

# Security
HTTPS_ENABLED=true
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem

# JWT
JWT_SECRET=${JWT_SECRET}  # From secrets manager
JWT_EXPIRATION=24h
JWT_ALGORITHM=HS256

# Rate Limiting (strict)
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=50

# CORS (specific origins)
CORS_ENABLED=true
CORS_ORIGINS=https://app.example.com

# Logging (secure)
LOG_LEVEL=warn  # Not debug in production
LOG_FILE=/var/log/homeassistant-mcp/app.log
LOG_ROTATION=true
LOG_MAX_FILES=30

# Features (minimal)
DEBUG=false
AI_FEATURES_ENABLED=true
EXPERIMENTAL_FEATURES=false
```

### Development vs Production

**Development** (relaxed security for testing):

```env
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=true
RATE_LIMIT_ENABLED=false
CORS_ORIGINS=*
HTTPS_ENABLED=false
```

**Production** (maximum security):

```env
NODE_ENV=production
LOG_LEVEL=warn
DEBUG=false
RATE_LIMIT_ENABLED=true
CORS_ORIGINS=https://specific-domain.com
HTTPS_ENABLED=true
```

### Reverse Proxy Setup

**Nginx** (recommended):

```nginx
server {
    listen 443 ssl http2;
    server_name homeassistant-mcp.example.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to MCP server
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting
        limit_req zone=mcp_limit burst=10;
    }
}

# Rate limit zone
limit_req_zone $binary_remote_addr zone=mcp_limit:10m rate=10r/s;
```

---

## Monitoring & Auditing

### Security Logging

**Configure security logs**:

```env
# Detailed security logging
LOG_LEVEL=info
LOG_SECURITY_EVENTS=true
LOG_AUTH_ATTEMPTS=true
LOG_FAILED_REQUESTS=true
```

**Log format**:

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "warn",
  "event": "auth_failed",
  "ip": "192.168.1.100",
  "user": "unknown",
  "reason": "invalid_token"
}
```

### Monitoring Metrics

**Key metrics to monitor**:

1. **Authentication failures**
   - Failed login attempts
   - Invalid tokens
   - Expired sessions

2. **Rate limit hits**
   - Requests blocked
   - Per-client rates
   - Spike detection

3. **Error rates**
   - 401/403 responses
   - Server errors
   - Timeout errors

4. **Unusual patterns**
   - Off-hours activity
   - Geographic anomalies
   - Volume spikes

### Audit Trail

**Enable audit logging**:

```env
AUDIT_ENABLED=true
AUDIT_LOG_FILE=/var/log/homeassistant-mcp/audit.log
AUDIT_INCLUDE_PARAMS=false  # Privacy
```

**Audit log format**:

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "user": "mcp_user",
  "action": "light.turn_on",
  "entity": "light.living_room",
  "result": "success",
  "ip": "192.168.1.100"
}
```

---

## Incident Response

### Security Incident Checklist

**If you suspect a security breach**:

- [ ] **Immediate**:
  - [ ] Revoke compromised tokens
  - [ ] Change all passwords
  - [ ] Block suspicious IPs
  - [ ] Enable extra logging

- [ ] **Investigation**:
  - [ ] Review audit logs
  - [ ] Check access patterns
  - [ ] Identify affected systems
  - [ ] Document findings

- [ ] **Remediation**:
  - [ ] Patch vulnerabilities
  - [ ] Update configurations
  - [ ] Rotate all credentials
  - [ ] Notify affected parties

- [ ] **Prevention**:
  - [ ] Implement additional controls
  - [ ] Update security policies
  - [ ] Enhance monitoring
  - [ ] Train users

### Token Revocation

**Revoke Home Assistant token**:

1. Home Assistant → Profile
2. Long-Lived Access Tokens
3. Click "Delete" on compromised token
4. Create new token
5. Update MCP server configuration
6. Restart MCP server

**Rotate JWT secret**:

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Update configuration
JWT_SECRET=$NEW_SECRET

# Restart server (invalidates all old tokens)
systemctl restart homeassistant-mcp
```

### Emergency Shutdown

**Stop MCP server immediately**:

```bash
# systemd
sudo systemctl stop homeassistant-mcp

# Docker
docker stop homeassistant-mcp

# Process
pkill -9 homeassistant-mcp
```

**Disconnect from network**:

```bash
# Block all traffic to port
sudo iptables -A INPUT -p tcp --dport 4000 -j DROP
sudo iptables -A OUTPUT -p tcp --sport 4000 -j DROP
```

---

## Security Checklist

### Pre-Deployment

- [ ] Use HTTPS for Home Assistant connection
- [ ] Use unique, strong Home Assistant token
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable audit logging
- [ ] Set appropriate log level (warn/error)
- [ ] Disable debug mode
- [ ] Configure firewall
- [ ] Use reverse proxy
- [ ] Enable HTTPS for MCP server
- [ ] Set strong JWT secret
- [ ] Review all configuration options

### Regular Maintenance

- [ ] Rotate Home Assistant tokens (quarterly)
- [ ] Rotate JWT secret (quarterly)
- [ ] Update dependencies monthly
- [ ] Review security logs weekly
- [ ] Check for updates weekly
- [ ] Audit user access quarterly
- [ ] Review firewall rules monthly
- [ ] Test backup restoration quarterly

### Monitoring

- [ ] Monitor failed authentication attempts
- [ ] Track rate limit violations
- [ ] Alert on unusual activity
- [ ] Review audit logs regularly
- [ ] Monitor resource usage
- [ ] Check for outdated dependencies
- [ ] Verify SSL certificate expiration

---

## Best Practices Summary

### ✅ Do's

- Use HTTPS everywhere
- Rotate credentials regularly
- Enable rate limiting
- Use strong secrets
- Monitor security logs
- Keep software updated
- Use least privilege principle
- Implement defense in depth
- Regular security audits
- Document security procedures

### ❌ Don'ts

- Don't commit secrets to git
- Don't use default passwords
- Don't disable security features in production
- Don't expose services directly to internet
- Don't ignore security warnings
- Don't share access tokens
- Don't use weak encryption
- Don't skip updates
- Don't disable logging
- Don't trust user input

---

## Security Resources

### Tools

- **[OWASP ZAP](https://www.zaproxy.org/)** - Security testing
- **[Snyk](https://snyk.io/)** - Dependency scanning
- **[Let's Encrypt](https://letsencrypt.org/)** - Free SSL certificates
- **[Fail2Ban](https://www.fail2ban.org/)** - Intrusion prevention

### Documentation

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Home Assistant Security](https://www.home-assistant.io/docs/configuration/securing/)

---

## Reporting Security Issues

**Found a security vulnerability?**

**Please DO NOT** create a public issue.

Instead:
1. Email: security@example.com (if available)
2. Use GitHub Security Advisories
3. Provide details:
   - Vulnerability description
   - Steps to reproduce
   - Impact assessment
   - Suggested fix

We take security seriously and will respond promptly!

---

**Stay secure!** Regular security practices keep your smart home safe. 🔒
