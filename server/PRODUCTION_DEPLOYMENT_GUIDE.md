# Production Deployment Guide - TaskM

## Token System Overview

Your application uses **two different token systems**:

### 1. Invitation Tokens (Crypto-based)
- **Format**: 64-character hex string
- **Generation**: `crypto.randomBytes(32).toString('hex')`
- **Storage**: Database (`User.pendingInvitation.token`)
- **Expiry**: 7 days
- **Purpose**: One-time invitation acceptance

### 2. JWT Authentication Tokens
- **Format**: JWT with header.payload.signature
- **Generation**: `jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })`
- **Storage**: Client-side only (stateless)
- **Expiry**: 7 days
- **Purpose**: API authentication after login

## Fixed Issues for Production

### ✅ JWT_SECRET Consistency
- **Problem**: Mixed fallback values (`'fallback-secret'` vs `'your-secret-key'`)
- **Solution**: Single `JWT_SECRET` constant used throughout the application
- **Impact**: Ensures tokens work consistently across all services

### ✅ Enhanced Error Logging
- **Added**: Detailed token validation logging
- **Added**: Database query debugging for invitation tokens
- **Added**: Token type detection and analysis

### ✅ Environment Validation
- **Added**: Startup validation for required environment variables
- **Added**: JWT_SECRET strength validation
- **Added**: Production-specific security checks

## Deployment Steps

### 1. Environment Setup

```bash
# 1. Copy the environment template
cp .env.template .env

# 2. Generate a secure JWT secret
openssl rand -base64 48

# 3. Edit .env with your values
nano .env
```

### 2. Required Environment Variables

```bash
# Strong JWT secret (minimum 32 characters)
JWT_SECRET=your-very-secure-jwt-secret-minimum-32-chars

# Production MongoDB URI
MONGODB_URI=mongodb://your-production-db/taskflow

# Email configuration
EMAIL_USER=your-app@yourdomain.com
EMAIL_PASS=your-app-specific-password

# Production frontend URL
CLIENT_URL=https://your-frontend-domain.com

# Production environment
NODE_ENV=production
```

### 3. Validation

```bash
# Validate your environment
node check-env.js

# Test a specific token (if needed)
node debug-token.js <token>
```

### 4. Security Checklist

#### JWT Secret
- [ ] At least 32 characters long
- [ ] Randomly generated (use `openssl rand -base64 48`)
- [ ] Never use default values like `'fallback-secret'`
- [ ] Keep secret secure and don't commit to version control

#### Database
- [ ] Production MongoDB URI set
- [ ] Database connection tested
- [ ] Proper authentication configured

#### Email
- [ ] Email service configured (Gmail, SendGrid, etc.)
- [ ] App-specific passwords used
- [ ] Test email sending works

#### Environment
- [ ] `NODE_ENV=production` set
- [ ] No development URLs in production
- [ ] All sensitive values secured

## Common Production Issues & Solutions

### Issue 1: "Invalid or expired invitation token"

**Debug Steps:**
```bash
# 1. Check if token exists in database
node debug-token.js <invitation-token>

# 2. Verify environment
node check-env.js

# 3. Check server logs for detailed error messages
```

**Common Causes:**
- Token expired (7-day limit)
- Database connection issues
- Token format corruption during email transmission

### Issue 2: JWT Authentication Failed

**Debug Steps:**
```bash
# 1. Verify JWT_SECRET is consistent
grep -r "JWT_SECRET" src/

# 2. Test JWT generation/verification
node debug-token.js <jwt-token>
```

**Common Causes:**
- JWT_SECRET mismatch between services
- Token expiry
- Incorrect token format

### Issue 3: Email Sending Failed

**Debug Steps:**
```bash
# Test email configuration
node test-email-config.js
```

**Common Causes:**
- Incorrect email credentials
- App-specific password not enabled
- Email service rate limits
- SMTP configuration issues

## Monitoring & Maintenance

### Log Monitoring
Monitor these log messages for issues:

```bash
# Success patterns
✅ Environment variables validated
✅ Found valid invitation for user
✅ JWT token generation and verification working

# Error patterns to watch
❌ No user found with valid invitation token
❌ JWT verification failed
⏰ Token found but expired
```

### Token Cleanup
Expired invitation tokens remain in the database. Consider adding cleanup:

```javascript
// Clean expired invitations (run periodically)
await User.updateMany(
  { 'pendingInvitation.expires': { $lt: new Date() } },
  { $unset: { pendingInvitation: 1 } }
);
```

## Testing in Production

### 1. Health Check
```bash
curl https://your-api-domain.com/api/health
```

### 2. Invitation Flow Test
1. Create invitation through admin panel
2. Check email delivery
3. Test invitation acceptance
4. Verify user creation and login

### 3. JWT Authentication Test
1. Login with valid credentials
2. Make authenticated API call
3. Test token refresh/expiry

## Troubleshooting Commands

```bash
# Environment validation
node check-env.js

# Token debugging
node debug-token.js <token>

# Database connection test
node -e "
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected');
  process.exit(0);
} catch (e) {
  console.log('❌ MongoDB failed:', e.message);
  process.exit(1);
}
"

# JWT test
node -e "
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
const token = jwt.sign({test: true}, process.env.JWT_SECRET);
const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log('✅ JWT working:', decoded);
"
```

## Deployment Platforms

### Docker
```dockerfile
# Ensure environment variables are passed
ENV JWT_SECRET=your-secret
ENV MONGODB_URI=your-mongodb-uri
ENV NODE_ENV=production
```

### Cloud Platforms (AWS, Google Cloud, Azure)
- Set environment variables in platform-specific configuration
- Use secret management services for sensitive values
- Configure health checks on `/api/health`

### Traditional Servers
- Use process managers like PM2
- Configure reverse proxy (nginx)
- Set up SSL certificates
- Configure firewall rules

## Support

If you encounter issues:

1. Run `node check-env.js` first
2. Check server logs for detailed error messages
3. Use `node debug-token.js <token>` for token-specific issues
4. Verify database connectivity
5. Test email configuration

The enhanced logging will provide detailed information about what's failing in the token validation process.
