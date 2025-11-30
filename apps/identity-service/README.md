# Identity Service

Authentication and user management service for the startup-investor platform.

## Features

- ✅ User registration with role selection (founder/investor)
- ✅ JWT-based authentication (24h expiration)
- ✅ Bcrypt password hashing (cost factor 12)
- ✅ Protected routes with JWT guard
- ✅ Database integration via existing DatabaseModule
- ✅ Refresh token support (7-day expiry)
- ✅ Email verification flow
- ✅ Password reset flow
- ✅ ZK credential integration
- ✅ Ledger event hashing

## API Endpoints

### POST /auth/register
Register a new user. Sends verification email.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "role": "founder"
}
```

**Response:**
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "role": "founder", "emailVerified": false },
  "accessToken": "jwt.token.here",
  "refreshToken": "refresh.token.here"
}
```

### POST /auth/login
Login existing user.

### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{ "refreshToken": "refresh.token.here" }
```

### POST /auth/logout
Revoke refresh token.

### GET /auth/verify-email?token=xxx
Verify email address.

### POST /auth/resend-verification
Resend verification email.

**Request:**
```json
{ "email": "user@example.com" }
```


### POST /auth/forgot-password
Request password reset email.

**Request:**
```json
{ "email": "user@example.com" }
```

### POST /auth/reset-password
Reset password with token.

**Request:**
```json
{ "token": "reset-token", "password": "newpassword" }
```

### GET /auth/me
Get current user profile (requires JWT).

## Environment Variables

- `JWT_SECRET` - Secret key for JWT signing
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Service port (default: 3007)
- `APP_URL` - Application URL for email links
- `LEDGER_SERVICE_URL` - Ledger service URL
- `CREDENTIAL_ISSUER_URL` - Credential issuer URL
- `RESEND_API_KEY` - Resend API key (free: 100 emails/day, get at resend.com)
- `EMAIL_FROM` - From email (default: onboarding@resend.dev)
- `EMAIL_FROM_NAME` - From name (default: ZKP Platform)

## Database Schema

### users
- `id` - UUID primary key
- `email` - Unique email address
- `password_hash` - Bcrypt hashed password
- `role` - User role (founder/investor)
- `email_verified` - Boolean
- `verification_token` - Email verification token
- `verification_expires` - Token expiry
- `reset_token` - Password reset token
- `reset_expires` - Token expiry
- `created_at`, `updated_at` - Timestamps

### refresh_tokens
- `id` - UUID primary key
- `user_id` - Foreign key to users
- `token` - Refresh token
- `expires_at` - Token expiry
- `revoked_at` - Revocation timestamp

### user_credentials
- `id` - UUID primary key
- `user_id` - Foreign key to users
- `credential_hash` - ZK credential hash
- `credential_type` - Type of credential
- `issued_at`, `revoked_at` - Timestamps

## Running

```bash
cd apps/identity-service
PORT=3007 bun run src/main.ts
```

## TODO

- [ ] Write unit tests
